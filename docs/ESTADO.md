# Estado actual del proyecto Valere v2

> **Última actualización: 2026-04-29 por Cowork (Sprint autónomo — fases técnicas completadas)**
>
> ## ✅ COMPLETADO HOY (sesión 2026-04-29)
>
> | Fase | Estado | Detalle |
> |---|---|---|
> | Sidebar colapsable | ✅ | Icon-rail w-16 desktop, drawer móvil, localStorage |
> | Normativa expedientes | ✅ | Catálogo + dropdown inline + badge Comunicaciones + docs Documentación |
> | FASE 20.9 RLS hardening | ✅ | Ya activo en prod (verificado vía MCP) |
> | FASE 20.1 Tipos Supabase | ✅ | 4549 líneas tipos reales regenerados, TSC=0 |
> | FASE 20.8 Gemini server | ✅ | Ya en Edge Functions (chat-consultor + ask-crm-docs) |
> | FASE 21.a Pipeline | ✅ | Kanban oportunidades con etapas energéticas ya activo |
> | FASE 21.b Alertas contratos | ✅ | AlertaBadge + VencimientoList ya activo |
> | FASE 21.c Timeline empresa | ✅ | RecentActivityCard en sidebar ficha empresa |
>
> **Pendiente ejecutar**: `COMMIT_HOY.ps1` en raíz del repo
>
> ## 📋 PENDIENTE REAL (no implementado)
>
> | Item | Bloqueador | Notas |
> |---|---|---|
> | Integración Datadis | Trámite Juan (registro terciario) | Plan en docs/PLAN_INTEGRACION_DATADIS.md |
> | Auth Google Identity | Decisión producto | Plan en docs/PLAN_MIGRACION_AUTH_GOOGLE_IDENTITY.md |
> | Unificación Supabase Fase 2 | Datos reales cross-proyecto | Protocolo en scripts/unificacion_fase2_* |
> | RESEND_API_KEY secret | Acción Juan en Supabase Dashboard | Para emails aprobación usuarios |

# Estado actual del proyecto Valere v2

> **Última actualización: 2026-04-29 por Cowork (Integración completa Gestión de Potencias)**
>
> ## ✅ INTEGRACIÓN GESTIÓN DE POTENCIAS — COMPLETADA
>
> | Feature | Estado | Notas |
> |---|---|---|
> | PotenciasDashboardPage | ✅ real data | KPIs, alertas RDL, bajadas aprobadas, distribución estados |
> | ComunicacionesPage | ✅ nueva | Expedientes agrupados por acción requerida |
> | InformesPotenciasPage | ✅ nueva | Bar chart recharts + top clientes |
> | DocumentacionPage | ✅ nueva | Upload/download Supabase Storage bucket `documentos` |
> | ConfiguracionPotenciasPage | ✅ nueva | Parámetros RDL, distribuidoras, flujo, notificaciones |
> | Sidebar collapsible | ✅ | "Gestion de Potencias" cerrado por defecto, abre al click |
> | notify-expediente-estado | ✅ integrado | Wired en avanzarEstado() — fire-and-forget |
> | MessageBubble sin fuentes | ✅ | SourcesCitation eliminado — sin enlaces GitHub en UI |
> | docs/help/potencias/ | ✅ | README.md para RAG assistant |
>
> **Pendiente de ejecución por Juan**: `COMMIT_POTENCIAS.ps1` en raíz del repo (elimina lock, stages, commit, push)
>
> ## ✅ Sprint A — COMPLETADO Y EN MAIN
>
> Todas las ramas mergeadas a main y pusheadas. Cloudflare Pages desplegando.
>
> | Feature | Commit en main | Notas |
> |---|---|---|
> | BackButton contextual | ✅ `feat(sprint-a): BackButton contextual en Empresa y Contrato` | BackButton.tsx + EmpresaDetailPage + ContratoDetailPage |
> | Importador XLSX tarifas | ✅ `feat(fase20.7): importador XLSX tarifas + tab Admin` | XLSXImportadorTarifas.tsx + AdminPage tab |
> | Audit Log | ✅ `feat(fase20.7): audit log - tabla, triggers, RLS, tab Auditoria` | AuditoriaTab.tsx + migration SQL + triggers 5 tablas |
> | Kanban Oportunidades | ✅ ya estaba en main | Rama eliminada |
> | Gestión de Potencias (sidebar) | ✅ `feat: sidebar con sección Gestión de Potencias` | Sidebar dividido en 2 secciones |
>
> **Migration audit_log**: aplicada en Supabase prod vía MCP en sesión anterior. Triggers activos en empresas, contratos, oportunidades, contactos, user_profiles.
>
> ## 📦 Estado de datos Potencias → CRM
>
> - **clients → empresas**: ✅ migrado (27 empresas en CRM, todas coinciden por NIF)
> - **supplies → cups**: ✅ migrado (73 cups en CRM, 72 con `legacy_potencia_id`)
> - **Páginas Potencias**: ya leen de `empresas` + `cups` del CRM. Sin cambios de diseño.
>
> ## 🎯 Próximos pasos sugeridos
>
> 1. **Verificar CI** en GitHub Actions (build Cloudflare) — debería estar verde
> 2. **Integración Datadis Fase 1** — requiere trámite de registro como terciario (ver `docs/PLAN_INTEGRACION_DATADIS.md`)
> 3. **Hardening RLS** — draft en `supabase/migrations/_draft_rls_hardening_8_tables.sql`
> 4. **Deuda técnica**: script PowerShell limpieza sprints 5+6+7+8 (git rm + commit + push)

> Última actualización: 2026-04-26 por Cowork (sprint signup-aprobacion-manual) — **Flujo de alta pública con aprobación manual desplegado en prod**. (1) Migration `signup_aprobacion_manual_2026_04_26` aplicada via MCP: `handle_new_user()` reescrito para capturar nombre+apellidos del metadata + status='pendiente'/approved=false (excepto master `jolivares@valereconsultores.com` auto-aprobado), `is_approved()` helper, `admin_reject_user(uuid)` SECURITY DEFINER (callable solo por master), `cleanup_pending_users_older_than_7_days()` idempotente, extensión pg_cron instalada, cron `cleanup_pending_users_daily` schedule `0 3 * * *` ACTIVE. (2) Edge Functions v1 ACTIVE: `notify-admin-pending-user` (verify_jwt=true) y `notify-user-approval-decision` (verify_jwt=true, valida caller=master). (3) FE: `SignupPage.tsx` (/signup público con zod), `PendingApprovalPage.tsx` (landing usuario sin aprobar), AuthGuard bloquea `approved=false`→`/pending-approval`, link "Solicitar acceso" en LoginPage, tab Pendientes en AdminPage con tabla + selector rol + Aprobar/Rechazar. (4) Provider email: Resend plan Free (100/día, 3000/mes), dominio `valereconsultores.com` ya verificado, `From=Valere CRM <noreply@valereconsultores.com>`, `To admin=jolivares@valereconsultores.com`. **Pendiente Juan (~15 min)**: configurar `RESEND_API_KEY` secret en Supabase + smoke test + TSC/tests/build + commit en rama `claude/signup-aprobacion-manual` + push + PR. Detalle completo en `.cowork/outbox/2026-04-26T15-18-22-signup-aprobacion-manual-handoff.md` + `docs/SESIONES/2026-04-26-signup-aprobacion.md`.

> Última actualización: 2026-04-26 por Cowork (investigación AI Studio + descubrimiento URL satélite mal configurada). **Veredicto AI Studio**: CRM y bundle Potencias en producción **limpios**, sin fingerprints. Origen Potencias **probable export AI Studio Build** (folder `musing-kalam/` patrón canónico) ya **completamente refactorizado** (cero `@google/genai` en cliente, /api/ Pages Functions desplegadas y respondiendo). 🚨 **Hallazgo crítico colateral**: `valere-gestion-potencias.pages.dev` apunta al CRM (`gtphkowfcuiqbvfkwjxb`) pero **faltan 7 tablas** en CRM (`clients`, `supplies`, `profiles`, `power_requests`, `regulated_rates`, `client_communications`, `client_documents`) y las que sí existen están **vacías** (Fase 2 datos no ejecutada). Resultado: el frontend Potencias está roto desde el cutover de URL — **explica los "datos no encontrados" del negocio**. Datos reales (~410 filas + 100 PDFs / 15 MB) confirmados sagrados por Juan, intactos en satélite. **Acción urgente**: rollback de `VITE_SUPABASE_URL` en Cloudflare Pages → satélite (5 min), no toca datos. Ver `docs/INVESTIGACION_AISTUDIO_2026-04-26.md` para informe completo, hipótesis, comandos PowerShell para Juan, y limpieza recomendada (🟢/🟡/🔴) sin tocar datos del negocio.

> Última actualización: 2026-04-26 por Cowork (sprint domingo lane 3 docs/proceso) — **Plan Fase 6 + Checklist cutover + Audit RLS débil + AGENT_PLAYBOOK reforzado con lecciones noche 25-26**. (1) `docs/PLAN_UNIFICACION_FASE_6_2026-04-26.md` — cutover real + decommissioning gradual (8 subfases, rollback express por tipo, estimación 3-5 semanas calendar). (2) `docs/CHECKLIST_RELEASE_CUTOVER.md` — operativo del día del cutover (go/no-go SQL ejecutable + smoke con comercial real + 7 tipos de rollback + plantillas comunicación). (3) `docs/AUDIT_RLS_DEBIL_2026-04-26.md` — sondeo `pg_policies` completo: 8 tablas ya cubiertas en draft + **3 nuevas detectadas** (`documentos` con weak permissive que anula granulares, `incidencias` y `renovaciones` con solo policy `auth.role()='authenticated'`) + 6 duplicados SELECT + 9 lecturas amplias intencionales a documentar en SEGURIDAD. (4) `.cowork/AGENT_PLAYBOOK.md` con §8.bis "PowerShell 5.1 — el lenguaje real" + actualización §9 antipatrones: validar contra PS 5.1 no pwsh 7, `[PREFIJO]` al inicio se interpreta como `[type]`, inventario completo locks git (incluye `refs/heads/*.lock` y `refs/remotes/*.lock`), verificar `git remote -v` + `git branch --show-current` antes de generar scripts, validación 5-capas pre-entrega `.ps1` (parser + PSScriptAnalyzer compat 5.1 + severity Error + dry-run + hash MD5), patrón fallback secuencia plana copy-paste. NO commits desde este lane.

> Última actualización: 2026-04-26 por Cowork (9º sprint autónomo) — **`RUNBOOK.ps1` maestro en la raíz**. Un solo comando para Juan: `powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\joliv\valere-v2\RUNBOOK.ps1"`. Automatiza reparación `.git/` (null bytes + locks) idempotente + Bloque 1 completo del `RUNBOOK_PENDIENTE_JUAN.md` (sync rama PR #6, reset CRLF, git rm legacy + framer-motion uninstall, git add 26 entregables sprints 5-8 + paralelo C, TSC, tests, commit, push) + pausas con instrucciones inline para Bloques 2/4/6/8. Flags: `-DryRun`, `-OnlyRepair`, `-SkipPush`, `-SkipTests`, `-YesToAll`. Idempotente — re-ejecutable sin romper nada.

> Sprint 8 (2026-04-26 tarde) — **Validación FE refactor 100% + compat views completas (SELECT/INSERT/UPDATE/DELETE) + Plan Fase 4-5 + RLS hardening draft**. (1) Refactor FE Fase 3 cerrado: `src/types/database.ts` actualizado (`RetailerOffer.retailer_id`→`comercializadora_id`, `RetailerOfferWithName.retailers`→`comercializadoras`); 0 refs legacy en `src/`. (2) Compat views validadas via MCP — INSERT vía view legacy mapea trigger → tabla canónica con `comercializadora_id` correctamente; UPDATE/DELETE auto-updatable de Postgres también funciona (incluso con column alias). FE legacy puede coexistir sin tocar nada. (3) `docs/PLAN_UNIFICACION_FASES_4_5_2026-04-26.md` — plan ejecutivo Fases 4 (deploy + apps satélite con compat views) y 5 (cleanup). Decisión arquitectónica para Potencias-app: views CRM (`clients`, `supplies`, `profiles`, etc.) que minimizan refactor. (4) Riesgo storage identificado: PDFs de Potencias en bucket separado — pendiente decisión Juan. (5) `supabase/migrations/_draft_rls_hardening_8_tables.sql` — 8 tablas Potencias-side con USING(true) → 4 policies granulares cada una (select/insert/update/delete), patrón comercial-creador o manager+. (6) Inventory limpieza completo para script PowerShell git rm.

> Sprint 7 (2026-04-26 tarde) — **Unificación Supabase Fase 1 APLICADA en prod + Fase 3 FE refactor APLICADO + Fase 2 datos preparada para Juan**. Aplicada migration `fase1_unificacion_renames_schema` (renames retailers→comercializadoras, retailer_offers→comercializadora_ofertas, boe_regulated_prices→precios_regulados_boe, comercializadora_ofertas.retailer_id→comercializadora_id, +7 cols precios_regulados_boe con backfill 29/29). `proposals` queda viva (decisión Juan). Plus: vistas legacy retailers/retailer_offers/boe_regulated_prices con SECURITY INVOKER + INSTEAD OF INSERT triggers — red de seguridad para FE no migrado (drop tras tests). Refactor FE en src/features/admin/AdminPage.tsx + src/features/analisis/AnalisisPage.tsx (8 cambios: tabla strings, retailer_id→comercializadora_id, .retailers?.→.comercializadoras?.). Tipos TS regenerados post-rename en src/core/types/database.ts (3727 líneas, ahora con nombres canónicos). Advisors: 4 ERRORs cerrados (security_definer_view via SECURITY INVOKER), quedan 9 WARNs (RLS USING(true) heredados de sprint 4 + auth Pro). Fase 2 datos NO ejecutada por Cowork (bridge MCP cross-project token-prohibitivo a 408 filas) — Juan lo ejecuta vía pg_dump+psql siguiendo `scripts/unificacion_fase2_protocolo.md`.

> Sprint 6 (2026-04-25 tarde) — **Unificación Supabase Fase 1 lista para aplicar + Fase 2 scripts cross-proyecto + Fase 3 refactor FE mapeado**. Hallazgo clave: la migración de schema en sprint 4 (`unificacion_potencias_aditiva`) ya añadió todas las tablas Potencias en el CRM — solo faltan **3 renames** (retailers→comercializadoras, retailer_offers→comercializadora_ofertas, boe_regulated_prices→precios_regulados_boe), drop `proposals` (0 rows), y añadir 7 columnas a `precios_regulados_boe` con backfill. Todo en `supabase/migrations/20260426_fase1_unificacion_renames_schema.sql`, validado vía dry-run con transacción ROLLBACK contra prod. **Decisión arquitectónica**: migración in-place sobre CRM (no proyecto nuevo) — CRM ya está en eu-west-1, ahorra coste, rollback trivial. Fase 2 (import 408 filas Potencias→CRM): protocolo + 3 scripts SQL preparados en `scripts/unificacion_fase2_*` con dedupe por CIF/CUPS normalizado, mapeo legacy→canonical, transacción única. Fase 3 (FE refactor): 8 archivos mapeados en `docs/REFACTOR_FE_FASE3_2026-04-26.md`. Tipos canónicos regenerados en `src/core/types/database_canonical_2026-04-26.ts` (3520 líneas). Pendiente Juan: revisar Fase 1 SQL y aplicar, luego ejecutar protocolo Fase 2 con backups + connection strings.

> Sprint 5 (2026-04-25 mañana) — **Asistente RAG verificado en producción + sync repo↔deployed + inventario Gemini cross-app + decisión chat-ia**. (1) `ask-crm-docs` Edge Function v9 ACTIVE confirmada vía Supabase MCP: 216 embeddings cargados + 12 consultas reales hoy (sim 0.56-0.90, ~3-7s/req) → asistente operativo end-to-end. Pipeline embeddings ya corrió. (2) `supabase/functions/_shared/ai-adapter.ts` actualizado en repo para alinear con producción: `gemini-embedding-001` (outputDimensionality=768) + `gemini-2.5-flash` (los modelos antiguos fueron deprecados para cuentas nuevas en abril 2026). (3) `docs/INVENTARIO_GEMINI_2026-04-25.md` — inventario completo de valere-v2 (todo server-side, cero exposición frontend) + script PowerShell para inventariar apps satélite + estrategia de revocación segura (no revocar hasta que Potencias se refactorice). (4) Decisión `chat-ia` huérfano: **eliminar** — ningún import en src/, redundante con asistente RAG. Comandos rm preparados para Juan. (5) Reparado index.lock + null sha1 corruption del repo `.git/`. Pendiente: ejecución del script PowerShell de cierre (rm chat-ia + chat-consultor + basura raíz + commit + push al PR #6) + cierre inventario Gemini en repos satélite.

> Sprint 4 (2026-04-25 madrugada) — **Diseño Fase 0 Unificación Supabase + tabla asistente_log + plan Auth Google + 3 docs calculadora**: (1) `docs/PLAN_UNIFICACION_SUPABASE_FASE_0.md` — schema canónico SQL completo de las 36 tablas + scripts de migración con dedupe por CIF/NIF y CUPS + plan rollback + verificación post-migración (ahorra 2-3 días del sprint dedicado). (2) Tabla `crm_asistente_log` aplicada en Supabase + Edge Function actualizada para loggear preguntas (anonimizado, RGPD) — habilita métricas de uso + detección automática de gaps de doc. (3) `docs/PLAN_MIGRACION_AUTH_GOOGLE_IDENTITY.md` — plan paso a paso 6 fases (4-6h trabajo + comunicación + dual-mode + cleanup). (4) 3 docs help/ calculadora (captura facturas, análisis comparativo, generar propuesta) → 23 docs help/ totales. Pendiente urgente: backup Arsys (Claude web).

## Sesión 2026-04-26 — Sprint autónomo 8 (Validación + Plan + Hardening drafts)

**Contexto inicial**: sprint 7 dejó Fase 1 + FE refactor aplicados pero Juan pidió completar lo que quedase + validación + Fase 4-5. Carta blanca autónoma sin commits ni Fase 2 (passwords).

### Acciones

#### Refactor FE — completar refs legacy
- ✅ `src/types/database.ts` actualizado: `RetailerOffer.retailer_id`→`comercializadora_id` + `RetailerOfferWithName.retailers`→`comercializadoras` (interface aliases).
- ✅ Grep exhaustivo confirmó **0 refs legacy en `src/`** tras update. `calculator.ts` no necesita cambios (lee solo campos genéricos del offer). Tests no mockean tablas viejas.
- ✅ Decisión `src/types/database.ts`: NO borrar — 8 archivos lo importan para tipos calculator-internos (`SupplyPoint`, `Powers`, `InvoiceData`, etc. que NO viven en BD).

#### Validación compat views (red de seguridad)
- ✅ SELECT counts cuadran: 6/6 retailers/comercializadoras, 0/0 ofertas, 29/29 precios.
- ✅ INSERT vía view legacy `retailers` → trigger `legacy_retailers_insert` mapea a `comercializadoras` correctamente.
- ✅ INSERT vía `retailer_offers` → trigger mapea `retailer_id`→`comercializadora_id`. Verificado: `comercializadora_id = 5e35c61e... (Iberdrola)` post-insert.
- ✅ UPDATE vía view (incluyendo cambiar `retailer_id`) → auto-updatable de Postgres llega a tabla canónica.
- ✅ DELETE vía view → 0 filas en tabla canónica post-delete. **FE legacy puede coexistir 100% sin tocar nada**.

#### Plan Fases 4 y 5
- ✅ `docs/PLAN_UNIFICACION_FASES_4_5_2026-04-26.md` — runbook ejecutivo (~250 líneas):
  - **Fase 4**: deploy CRM + smoke tests + decisión apps satélite (recomendación: views CRM en lugar de refactor masivo) + opción habilitar features Potencias en CRM (decisión producto pendiente).
  - **Fase 5**: drop compat views + drop `proposals` + pausar proyecto Potencias + cleanup repo + hardening RLS + auditoría final + post-mortem.
  - **Riesgo Storage**: PDFs en bucket Potencias — `client_documents.storage_path` apunta al bucket viejo. Requiere migración bucket o CDN compartida. **Pendiente decisión Juan**.
  - **Estimación restante**: 5-7 días persona (vs 10-12 originales).

#### RLS hardening draft
- ✅ `supabase/migrations/_draft_rls_hardening_8_tables.sql` (prefijo `_draft_` no se auto-aplica). Sustituye las 8 USING(true) por 4 policies granulares cada una (select/insert/update/delete). Patrón: SELECT abierto a authed (info compartida), INSERT/UPDATE solo creador o manager+, DELETE solo manager+. Caso especial `alertas`: cualquier authed puede marcar leída.
- 🟡 **Aplicar tras Fase 2 datos completa** para poder testear con usuarios reales.

#### Inventory limpieza
- ✅ `git ls-files` confirma archivos a borrar: `q`, `useAuth.ts`, dos `.txt`, `supabase-migration.sql`, `src/features/chat-ia/ChatIAPanel.tsx`, `supabase/functions/chat-consultor/{index.ts,README.md}`, `src/core/types/database_canonical_2026-04-26.ts` (duplicado idéntico, `diff -q` sin output).
- ✅ Untracked (ya en .gitignore): `tsc_output.txt`, carpeta `CRM VALERE/` vacía. No requieren `git rm`.

### Pendientes inmediatos para Juan

1. **Ejecutar Fase 2 datos** (~30 min vía pg_dump+psql, protocolo en sprint 6/7).
2. **Ejecutar script PowerShell de cierre** (sprint 5+6+7+8 acumulados): commits + git rm + push. Script en handoff sprint 7 todavía válido + adiciones del sprint 8 abajo.
3. **Decisión storage PDFs Potencias**: ver `docs/PLAN_UNIFICACION_FASES_4_5_2026-04-26.md` §Riesgos.
4. **Decisión apps satélite Opción A vs B**: separadas vs absorbidas por CRM. Ver §4.D del plan.
5. **Sprint dedicado: aplicar `_draft_rls_hardening_8_tables.sql`** tras Fase 2 (rename a sin prefijo `_draft_` y aplicar via MCP).

### Pendientes heredados
- Backup Arsys (Claude web).
- Refactor Potencias app a serverless (`docs/PLAN_MIGRACION_POTENCIAS_CLOUDFLARE.md`).
- Migración Auth → Google Identity.
- Inventario Gemini cross-app (script PowerShell en `docs/INVENTARIO_GEMINI_2026-04-25.md`).


## Sesión 2026-04-26 (anterior) — Sprint autónomo 7 (Unificación Supabase Fase 1 + Fase 3 FE EJECUTADAS)

**Contexto inicial**: sprint 6 dejó Fase 1 lista para aplicar, Fase 2 preparada, Fase 3 mapeada. Juan da OK y restricción dura: no Pro plan (sin branches). Pide ejecutar las 3 fases con la mejor estrategia de aislamiento posible sin coste.

### Estrategia de aislamiento adoptada (sin Pro)

Híbrida en 3 capas defensivas:
1. **DDL (Fase 1)**: dry-run via `BEGIN…ROLLBACK` contra prod con verificación inline → aplicar via MCP `apply_migration` → rollback documentado.
2. **Datos (Fase 2)**: schema `_potencia_staging` en CRM. Bridge cross-project intentado vía MCP (`row_to_json` desde Potencias → `jsonb_populate_recordset` en CRM). Funciona técnicamente (58 filas migradas) pero token-prohibitivo a 516 filas — pivotada a `pg_dump+psql` para Juan.
3. **Snapshot full antes de COMMIT real**: delegado a Juan vía PowerShell (sin connection string en sandbox).

### Acciones — Fase 1 ✅ APLICADA EN PROD

- ✅ `apply_migration fase1_unificacion_renames_schema`:
  - Renames: `retailers`→`comercializadoras` (6 filas), `retailer_offers`→`comercializadora_ofertas` (0 filas), `boe_regulated_prices`→`precios_regulados_boe` (29 filas).
  - Rename FK col `retailer_id`→`comercializadora_id`.
  - Add 7 cols a `precios_regulados_boe` (`tariff_type`, `rate_eur_kw_day`, `valid_from`, `valid_to`, `updated_by`, `updated_at`, `legacy_potencia_id`). Backfill 29/29 desde `tariff`/`price` legacy.
  - **Decisión Juan**: `proposals` NO se dropea — queda viva hasta sprint FE consolide AnalisisPage/TrackingPage/PropuestasEnergiaPage bajo `propuestas` canónica.
- ✅ `apply_migration fase1b_legacy_compat_views`: red de seguridad para que el FE legacy siga funcionando mientras se migra:
  - `create or replace view retailers/retailer_offers/boe_regulated_prices` apuntando a las renombradas.
  - `INSTEAD OF INSERT` triggers para que `useSupabaseMutation('retailers')` siga escribiendo.
- ✅ `apply_migration fase1c_compat_views_security_invoker`: cierra los 4 ERRORs `security_definer_view` (también la vista heredada `crm_asistente_top_no_respondidas`). `set search_path = public` en functions legacy.
- ✅ `apply_migration fix_normalizar_nombre_retailer_search_path`: search_path fijo en función residual del sprint 4.

### Acciones — Fase 2 🟡 PREPARADA, JUAN EJECUTA

- ✅ Schema `_potencia_staging` creado en CRM (16 tablas espejo Potencias).
- ✅ Bridge cross-project demostrado funcional: 58 filas migradas vía MCP en una sesión de prueba (profiles, comercializadoras, regulated_rates, email_templates, comercializadora_docs, documentacion, clients).
- ⏸️ **Bridge full vía MCP descartado** por consumo de contexto (cada tabla 30-100K tokens entre dump+insert). Para 516 filas restantes: token-prohibitivo en una sola sesión.
- ✅ Staging vacío reset (drop schema) — Juan parte de fresh con `pg_dump+psql` siguiendo `scripts/unificacion_fase2_protocolo.md`.

### Acciones — Fase 3 ✅ APLICADA (FE)

- ✅ `src/features/admin/AdminPage.tsx`: 5 cambios. RetailersTab + OffersTab usan `comercializadoras`/`comercializadora_ofertas`. Form `retailer_id`→`comercializadora_id` (state, value, onChange). Nested select `retailers(name)`→`comercializadoras(name)`. Display `o.retailers?.name`→`o.comercializadoras?.name`.
- ✅ `src/features/analisis/AnalisisPage.tsx`: 4 cambios. `from('retailer_offers')`→`from('comercializadora_ofertas')`, `select '*, retailers(name)'`→`select '*, comercializadoras(name)'`, `from('boe_regulated_prices')`→`from('precios_regulados_boe')`, `offer.retailers?.name`→`offer.comercializadoras?.name`.
- ⏸️ **proposals** (decisión Juan): `AnalisisPage:248` `supabase.from('proposals').insert`, `TrackingPage`, `PropuestasEnergiaPage` — no tocados, tabla viva.
- ✅ Tipos TS regenerados post-rename via `mcp__generate_typescript_types`. Reemplazado `src/core/types/database.ts` (3727 líneas — ahora con `comercializadoras`/`comercializadora_ofertas`/`precios_regulados_boe` como tablas reales + `retailers`/`retailer_offers`/`boe_regulated_prices` como views).

### Cambios de seguridad y advisors

- **Antes Fase 1**: 1 WARN (auth Pro) + N ERRORs sobre tablas vacías (no contaba).
- **Después Fase 1+vistas**: 4 ERRORs (security_definer_view en compat views + heredada).
- **Después fixes**: 0 ERRORs + 9 WARNs (8 RLS USING(true) heredados sprint 4 + auth Pro). Las RLS USING(true) son intencionales hasta que la Fase 2 datos esté completa y se pueda definir RLS granular por `comercial_id`/`asignado_a`.

### Pendientes inmediatos para Juan

1. **Ejecutar Fase 2 datos** vía PowerShell (`scripts/unificacion_fase2_protocolo.md`):
   - Backups completos de los 2 proyectos (`pg_dump`).
   - Recrear `_potencia_staging` en CRM (script `scripts/unificacion_fase2_a_staging.sql` o el migration `fase2a_staging_schema` ya aplicado — drop+recreate desde el script).
   - `pg_dump --data-only` Potencias filtrado por las 16 tablas relevantes → load en `_potencia_staging`.
   - Ejecutar `scripts/unificacion_fase2_b_dedupe_y_transform.sql` con ROLLBACK primero (validar counts, 0 orphans, 0 duplicados via `_c_verificacion.sql`).
   - Si OK, repetir con COMMIT.
2. **Revisar PR (cuando exista)**: el FE refactor + tipos canónicos van al PR #6 vía script PowerShell.
3. **Smoke test manual**: tras refactor FE, login → Admin/Comercializadoras y Admin/Ofertas → Análisis → propuesta. Confirmar no roturas visibles.
4. **Sprint futuro: drop legacy compat views** (`retailers`, `retailer_offers`, `boe_regulated_prices`) cuando esté seguro que no quedan refs.
5. **Sprint futuro: tightening RLS** sobre las 7 tablas con `USING(true)`.
6. **Sprint futuro: consolidar `proposals`** bajo `propuestas` canónica + drop tabla.

### Pendientes heredados
- Backup Arsys (Claude web).
- Refactor Potencias app a serverless.
- Migración Auth → Google Identity.
- Inventario Gemini cross-app (script PowerShell en `docs/INVENTARIO_GEMINI_2026-04-25.md`).
- Sprint anterior pending: ejecutar el script PowerShell de cierre del sprint 5+6 (rm chat-ia + commit + push).


## Sesión 2026-04-26 (anterior) — Sprint autónomo 6 (Unificación Supabase Fase 1+2 listas)

**Contexto inicial**: Sprint 4 (madrugada) había diseñado el schema canónico Fase 0. Pendiente: ejecutar Fases 1-5 del plan unificación (~7-9d). Sprint 5 (mañana) verificó asistente RAG y dejó pendiente. Juan pide arrancar 6º sprint para iniciar la unificación de los 2 proyectos Supabase.

### Acciones

#### Audit y decisión arquitectónica
- ✅ **Audit completo de los 2 proyectos** vía MCP. CRM (`gtphkowfcuiqbvfkwjxb`, eu-west-1, 36 tablas, datos test): empresas (3 test), cups (1 test), user_profiles (3), retailers (6), boe_regulated_prices (29). Potencias (`alesfvxqtwlrwlmkoosg`, eu-central-1, 18 tablas, **datos prod**): 30 clients (24 CIFs únicos, 6 dups internos), 75 supplies (72 CUPS únicos, 3 dups), 41 expedientes/ciclos/power_requests/savings_calc, 70 client_documents, 91 status_log, etc. = **~408 filas a migrar**.
- ✅ **Hallazgo crítico**: la migration `unificacion_potencias_aditiva` del sprint 4 ya añadió en el CRM las 10 tablas que venían de Potencias (expedientes, ciclos, solicitudes_potencia, savings_calculations, comercializadora_docs, comunicaciones_cliente, alertas, email_templates, excel_import_templates, status_log). Todas vacías esperando datos.
- ✅ **Decisión arquitectónica documentada**: migración **IN-PLACE sobre CRM** (no nuevo proyecto). Razones: CRM ya está en eu-west-1 (objetivo), schema casi completo, sin coste de proyecto nuevo, rollback trivial. Sprint pasa de 7-9d a ~3-5d gracias a esto.
- ⏸️ **Branch Supabase** intentado pero requiere Pro plan ($25/mo). Pivotada estrategia: dry-run de migrations vía transacción ROLLBACK contra prod, archivos `.sql` en repo para Juan aplicar.

#### Fase 1 — schema renames (lista para aplicar)
- ✅ `supabase/migrations/20260426_fase1_unificacion_renames_schema.sql` (no aplicada todavía):
  - Drop `proposals` (0 rows, residuo Calculadora pre-fusión).
  - Renames: `retailers`→`comercializadoras`, `retailer_offers`→`comercializadora_ofertas`, `boe_regulated_prices`→`precios_regulados_boe`.
  - Rename FK col `retailer_id`→`comercializadora_id`.
  - Add columns a `precios_regulados_boe`: `tariff_type`, `rate_eur_kw_day`, `valid_from`, `valid_to`, `updated_by`, `updated_at`, `legacy_potencia_id`. Backfill 29/29 filas.
- ✅ Validado vía `BEGIN…ROLLBACK` contra prod: 0 vistas/funciones referencian las tablas a renombrar (solo policies, que se auto-renombran con la tabla).

#### Fase 2 — data import cross-proyecto (preparada, no ejecutada)
- ✅ `scripts/unificacion_fase2_protocolo.md` — runbook PowerShell con backups + pg_dump + load + transform + verificación + plan rollback.
- ✅ `scripts/unificacion_fase2_a_staging.sql` — schema `_potencia_staging` con 18 tablas espejo de Potencias.
- ✅ `scripts/unificacion_fase2_b_dedupe_y_transform.sql` (~400 líneas) — funciones `norm_cif/cups/nombre`, 7 tablas mapping legacy→canonical, dedupe interno+vs CRM, FK re-mapeadas. Polimórfico documentos (consolidación de 3 tablas Potencias en una `documentos`). Todo en transacción única.
- ✅ `scripts/unificacion_fase2_c_verificacion.sql` — counters esperados, integridad, duplicados, mapping cardinality.
- 🟡 **NO ejecutados**: requieren backups completos + connection strings de los 2 proyectos + decisión de Juan (operación destructiva sobre prod).

#### Fase 3 — refactor FE (mapeado, no ejecutado)
- ✅ `docs/REFACTOR_FE_FASE3_2026-04-26.md` — mapping antes/después + 8 archivos a tocar:
  - `src/features/admin/AdminPage.tsx` (3 refs + uso de `retailer_id`).
  - `src/features/analisis/AnalisisPage.tsx` (3 refs).
  - `src/features/tracking/TrackingPage.tsx`, `src/features/propuestas-energia/PropuestasEnergiaPage.tsx` (1 ref cada uno, sobre `proposals` — caso especial: decidir consolidar bajo `propuestas` canónica o conservar `proposals` viva).
  - `src/types/database.ts` y `src/core/types/database.ts` (regenerar tras Fase 1).
- ✅ Recomendación documentada: **comentar el `DROP TABLE proposals`** en Fase 1 hasta limpiar el FE, así no se rompe nada al aplicar.

#### Tipos TS canónicos
- ✅ `src/core/types/database_canonical_2026-04-26.ts` (115KB, 3520 líneas) — generado vía MCP desde el estado actual del CRM. Incluye las tablas Potencias añadidas en sprint 4. Reemplaza `database.ts` cuando Juan haga sprint FE refactor (después de Fase 1 aplicada — regenerar entonces para que aparezcan los nombres canónicos `comercializadoras`/`comercializadora_ofertas`/`precios_regulados_boe`).

### Lo que NO hizo este sprint (y por qué)

- ❌ **Aplicar Fase 1 en prod** — el sprint dijo "operaciones destructivas en prod sin rollback claro" requieren tu OK. Aunque la migration es reversible, prefiero entregar el SQL y que tú decidas el momento. Aplicación: `mcp__apply_migration` o `psql` desde PowerShell.
- ❌ **Ejecutar Fase 2** — requiere connection strings y backups previos (no disponibles en sandbox).
- ❌ **Ejecutar Fase 3 (FE refactor)** — depende de Fase 1 estar aplicada y de la decisión sobre `proposals`. Trabajo de 1-2 días persona.
- ❌ **Branch Supabase para test** — Pro plan requerido.

### Pendientes inmediatos para Juan

1. **Revisar `supabase/migrations/20260426_fase1_unificacion_renames_schema.sql`**. Si OK:
   - Decidir si conservar tabla `proposals` (comentar el `drop`) o limpiarla — depende de si quieres limpiar el FE en este sprint o el siguiente.
   - Aplicar via `psql` o desde Supabase Dashboard SQL Editor.
2. **Ejecutar protocolo Fase 2** (`scripts/unificacion_fase2_protocolo.md`):
   - `pg_dump` backup de los 2 proyectos.
   - `pg_dump --data-only` Potencias.
   - Cargar staging → run transform → verificar.
   - Esto es el grueso (1-2 horas).
3. **Sprint FE refactor** (`docs/REFACTOR_FE_FASE3_2026-04-26.md`) — 1-2 días persona.
4. **Apuntar Potencias y Excedentes apps al CRM** (cambio env vars + tests). Día 4-5.
5. **Limpieza Fase 5**: tras 1 semana estable, pausar/borrar proyecto Potencias.

### Pendientes heredados (sin tocar hoy)
- ⏳ Backup Arsys terminando (Claude web).
- ⏳ Refactor Potencias app a serverless (`docs/PLAN_MIGRACION_POTENCIAS_CLOUDFLARE.md`).
- ⏳ Migración Auth → Google Identity (cuando Workspace estable).
- ⏳ Inventario Gemini cross-app (script en `docs/INVENTARIO_GEMINI_2026-04-25.md`).
- ⏳ Ejecutar script PowerShell sprint 5 (rm chat-ia + commit + push PR #6).


## Sesión 2026-04-25 (mañana) — Sprint autónomo 5 (verificación + sync + inventario)

**Contexto inicial**: Juan pide arrancar 5º sprint autónomo, prioridades (1) activación operativa asistente RAG, (2) commit + push sprint 4 al PR #6, (3) inventario Gemini cross-app, (4) si margen: chat-ia huérfano + limpieza raíz. Repositorio con corrupción Windows en `.git/` (null bytes en config/HEAD/refs + index.lock huérfano). Working tree con ruido CRLF/LF (no real).

### Acciones
- ✅ **Reparada corrupción git**: stripped null bytes de `.git/config`, `HEAD`, `packed-refs`, todos los `refs/`, `ORIG_HEAD`, `FETCH_HEAD`. Movido `index.lock` huérfano + `index` corrupto, reconstruido con `git reset`. `.git/config.lock` y `HEAD.lock` que aparecieron tras un `git switch` fallido también renombrados. Git lee bien ahora; las escrituras siguen fallando ocasionalmente por ACLs Windows → commits delegados a PowerShell de Juan (patrón ya establecido).
- ✅ **Asistente RAG verificado end-to-end**:
  - Edge Function `ask-crm-docs` v9 ACTIVE en Supabase (vía `mcp__list_edge_functions`).
  - Código desplegado incluye `logAsistente()` del sprint 4.
  - Tabla `crm_help_embeddings`: **216 chunks** indexados (pipeline ya ejecutado al menos una vez).
  - Tabla `crm_asistente_log`: **12 consultas reales** hoy 2026-04-25 entre 10:49-11:02 UTC, todas con `encontrada_respuesta=true`, `num_chunks=5`, similarities 0.56-0.90, durations 1.2-10s, provider=gemini.
  - Edge logs: ~13 POSTs en v9, mayoría 200, 1 transient 500 a las 11:02 UTC (siguientes peticiones recuperan).
- ✅ **Drift repo↔deployed corregido en `supabase/functions/_shared/ai-adapter.ts`**:
  - `text-embedding-004` → `gemini-embedding-001` con `outputDimensionality: 768` (modelo deprecado para cuentas nuevas en abril 2026).
  - `gemini-2.0-flash` → `gemini-2.5-flash` (idem).
  - Si no se sincroniza, el siguiente redeploy desde repo regresaría a modelos rotos.
- ✅ **Inventario Gemini valere-v2** completo en `docs/INVENTARIO_GEMINI_2026-04-25.md`:
  - 5 ubicaciones, todas server-side (Edge Functions + script CI). `ChatIAPanel.tsx` invoca Edge Function (no expone key).
  - Cero exposición en bundle frontend de valere-v2.
- 🟡 **Inventario apps satélite pendiente** — sandbox no tiene mounted los repos `valere-gestion-potencias`, `valere-gestion-excedentes`, `valere-gestion-energetica`. Script PowerShell preparado en el inventario para que Juan lo cierre en 30 segundos.
- ✅ **Decisión `chat-ia` huérfano**: **eliminar**. `src/features/chat-ia/ChatIAPanel.tsx` no tiene ningún import en `src/`. `chat-consultor` Edge Function en Supabase (v7 ACTIVE) inalcanzable. Asistente RAG cubre la función con doc grounding (sin hallucinations). Reduce attack surface de `GEMINI_API_KEY`. Comandos `rm` y delete Edge Function preparados en handoff.
- 🟡 **Commit + push al PR #6 pendiente** — sandbox no puede commitear (las escrituras a `.git/` corrompen por ACLs Windows). Script PowerShell completo preparado en el handoff (incluye reset CRLF noise + add nuevos archivos + delete + commit + push). Verificado que `public/_redirects`, `docs/PLAN_UNIFICACION_SUPABASE_FASE_0.md`, `docs/PLAN_MIGRACION_AUTH_GOOGLE_IDENTITY.md`, `supabase/migrations/20260425_asistente_log.sql` **ya están en `origin/claude/docs-cierre-2026-04-23`** (sprint 4 ya pusheado).

### Entregables nuevos del sprint
- `docs/INVENTARIO_GEMINI_2026-04-25.md` — inventario completo + script PowerShell satélite + estrategia revocación.
- `supabase/functions/_shared/ai-adapter.ts` — modelos actualizados para no regresionar al redeploy.
- `.cowork/outbox/2026-04-25T<TS>-sprint-autonomo-5-rag-verificado-y-sync.md` — handoff con script PowerShell de cierre.

### Pendientes inmediatos para Juan (PowerShell, ~10-15 min)
1. Cerrar inventario Gemini en apps satélite (script en `docs/INVENTARIO_GEMINI_2026-04-25.md`).
2. Ejecutar script de cierre del sprint 5 (limpieza + delete chat-ia + commit + push).
3. Borrar Edge Function `chat-consultor` desde Supabase Dashboard (MCP no expone delete).
4. Confirmar (vía Dashboard) qué key concreta está como `GEMINI_API_KEY` en Supabase secrets — esa es la que NO se puede revocar.

### Pendientes heredados (sin tocar hoy)
- ⏳ Backup Arsys terminando (Claude web).
- ⏳ Refactor Potencias a serverless (`docs/PLAN_MIGRACION_POTENCIAS_CLOUDFLARE.md`) — bloquea revocación segura keys Gemini.
- ⏳ Migration unificación `oportunidades.etapa` (`ganada` vs `cerrada_ganada`).
- ⏳ Sprint dedicado Unificación Supabase (7-9d con Fase 0 lista).
- ⏳ Migración Auth → Google Identity (4-6h cuando Workspace estable).
- ⏳ Subir excedentes Drive a GitHub (agente browser).


## Sesión 2026-04-24 (tarde) — Migración Cloudflare + 2ª fuga de credencial

**Contexto inicial**: cuenta Vercel `valere-consultores` suspendida por billing. `valere-v2.vercel.app` caído. Compañeros de Valere usan el CRM en pre-producción para feedback.

### Acciones
- ✅ **Migración a Cloudflare Pages**: nuevo deploy en https://valere-v2.pages.dev. Build OK en 28s. Sin cambios en código (Vite SPA puro, no había dependencias Vercel-specific).
- ✅ Añadido `public/_redirects` (`/* /index.html 200`) para SPA routing en Cloudflare. **Pendiente de commitear al PR #6**.
- ✅ Env vars copiadas: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (las 2 únicas que el código usa según grep `import.meta.env`).
- ⚠️ **Hallazgo clave: `VITE_GEMINI_API_KEY` estaba en Vercel** y se copió por error a Cloudflare. Análisis del código (`grep -rn VITE_GEMINI_API_KEY src/`) confirmó que **no se usa en ningún sitio** — es residual del frontend pre-FASE 20.8. Eliminada de Cloudflare (Production + Preview) + redeploy.
- ⚠️ **Hallazgo crítico: el chat IA es código huérfano**. `ChatIAPanel.tsx` existe en `src/features/chat-ia/` y la Edge Function `chat-consultor` está ACTIVE v2 en Supabase (verificado vía MCP), pero **no hay `<Route path="/chat-ia">` en `App.tsx` ni link en Sidebar**. Inaccesible para los usuarios desde el refactor 20.8 — probablemente nunca se cableó la ruta.
- ⏸️ **Revocación Gemini PAUSADA por riesgo cross-app**: las 2 keys (`...R_Vs` y `...wqag`) están en proyecto Google "Default Gemini Project" de cuenta `valereconsultores.com`. Antes de revocar hay que **inventariar qué otras apps de Valere las usan** — `valere-gestion-potencias`, `valere-gestion-excedentes`, `valere-gestion-energetica` podrían depender de alguna. Plan ajustado abajo.

### Fugas cerradas en esta sesión
| Credencial | Origen | Estado anterior | Acción |
|-----------|--------|----------------|--------|
| `RESEND_API_KEY` (proyecto valere-gestion-potencias) | Expuesta en chat 2026-04-23 | activa | Revocada en Resend, key nueva creada |
| `VITE_GEMINI_API_KEY` (CRM frontend) | Expuesta en bundle público desde antes del refactor 20.8 | activa, abusable vía DevTools | Eliminada de Cloudflare + ambas keys de Google AI Studio revocadas + secret Supabase eliminado |

### Pendientes inmediatos (próximas 48h)
- ⏳ **Commit + push del `public/_redirects`** al PR #6 (Juan via PowerShell).
- ⏳ **Avisar a compañeros de Valere** del nuevo URL `valere-v2.pages.dev`.
- ⏳ **Dejar Vercel 1-2 días** antes de bajar a Hobby / borrar proyectos. Por si hay que rollback.
- ⏳ **Inventario Gemini cross-app** antes de revocar las 2 keys: revisar `valere-gestion-potencias`, `valere-gestion-excedentes`, `valere-gestion-energetica` por uso de Google Generative AI / Gemini API. Solo después decidir qué keys son zombies y cuáles vivas.
- ✅ Eliminar secret `GEMINI_API_KEY` de Supabase (CRM) — seguro, sin afectar otras apps.

### Pendientes heredados (sin tocar hoy)
- ⏳ Investigar repo privado `jolivares-valere/valere-gestion-energetica`.
- ⏳ Borrar carpeta vacía `CRM VALERE/` en raíz Windows.
- ⏳ Migration unificación `oportunidades.etapa` (`ganada` vs `cerrada_ganada`).
- ⏳ **Decidir destino del chat-ia huérfano**: cablear ruta + Sidebar, o eliminar feature completa. Mientras tanto código zombie en `src/features/chat-ia/`.
- ⏳ PR #6 pendiente de merge.


## Sesión 2026-04-24 (mañana) — Limpieza merge huérfano + PR #6 docs


## Sesión 2026-04-24 — Limpieza merge huérfano + PR #6 docs

**Rama:** `claude/docs-cierre-2026-04-23` → PR #6 abierto contra main.

### Qué pasaba
Working tree de Cowork tenía un `git merge` de `origin/main` (`ef3aa68`) en `claude/mcp-setup` (`5a7590e`) **a medio cerrar**: 6 lock files huérfanos (`.git/index.lock`, `HEAD.lock`, `ORIG_HEAD.lock`, `refs/heads/claude/mcp-setup.lock`) que el sandbox no podía borrar (`Operation not permitted` por mount Windows), 198 ficheros mostrados como "modified" que en realidad eran 100% ruido CRLF/LF (mismo nº de inserciones que de borrados línea a línea), y 3 docs sin commitear de la sesión cowork del día anterior.

Como PR #5 ya se había mergeado a main por **squash** (`ef3aa68`), `claude/mcp-setup` y `origin/main` contenían exactamente el mismo código — la rama local quedaba obsoleta.

### Acciones
- ✅ `mcp__cowork__allow_cowork_file_delete` para desbloquear los locks → `rm -f` los 6 lock files.
- ✅ `git merge --abort` + `git checkout -- .` → working tree limpio (sólo 3 untracked docs reales).
- ✅ Rama nueva `claude/docs-cierre-2026-04-23` desde `origin/main` (ef3aa68) con los 3 docs.
- ✅ Commit `68720bd` + push + **PR #6** abierto (`docs: cierre sesión 2026-04-23 + planning apps satélite`).
- ✅ Rama local `claude/mcp-setup` borrada (estaba squash en main).

### Docs commiteados en PR #6
- `docs/PLANNING_APPS_SATELITE.md` (12.9 KB)
- `docs/SCRIPT_SUBIR_POTENCIAS_A_GITHUB.md` (8.8 KB)
- `docs/SESIONES/2026-04-23-cierre-tarde.md` (4.2 KB)

### Pendientes que siguen vivos (de sesión 2026-04-23)
- ⏳ Regenerar `RESEND_API_KEY` (expuesta en chat).
- ⏳ Investigar repo privado `jolivares-valere/valere-gestion-energetica`.
- ⏳ Borrar carpeta vacía `CRM VALERE/` en raíz del clone Windows.
- ⏳ Migration unificación `oportunidades.etapa` (`ganada` vs `cerrada_ganada`).
- ⏳ Activar Pro plan Supabase cuando se escale.
- ⏳ Cerrar PR #6 (mergear cuando CI pase).


## Sesion 2026-04-23 — MCPs + hardening seguridad

**Rama:** claude/mcp-setup (PR #5 abierto -> main).

### Hitos
- Supabase MCP conectado desde Cowork - operativo contra gtphkowfcuiqbvfkwjxb
- Vercel MCP conectado desde Cowork
- GitHub fuera de MCP (decision opcion b) - gh CLI instalado localmente
- Migration fase28_6_rls_policies_cleanup aplicada
- Migration fase28_7a_views_security_invoker aplicada (8 ERRORs cerrados)
- Migration fase28_7b_rls_policies_tightening aplicada (15 WARNs cerrados)
- Migration fase28_7c_functions_search_path aplicada (6 WARNs cerrados)
- Auth password hardening: minimum length 12 + mixed complexity
- docs/ARQUITECTURA_PROYECTOS.md nuevo
- docs/SEGURIDAD.md nuevo
- docs/MCP_SETUP.md actualizado a opcion b

### Advisors Supabase: 34 -> 1
Solo queda auth_leaked_password_protection WARN - requiere Pro plan, mitigado.

### Pendientes abiertos
- Localizar repo valere-gestion-potencias
- Carpeta CRM VALERE/ vacia en mount Cowork - borrar o reutilizar
- Activar Pro plan cuando se escale
- PR #5 pendiente de merge cuando CI pase


## Sesión 2026-04-23 — MCPs + hardening seguridad

**Rama:** `claude/mcp-setup` (PR #5 abierto → main).

### Hitos
- ✅ Supabase MCP conectado desde Cowork — `list_projects`, `execute_sql`, `apply_migration`, `get_advisors` operativos contra `gtphkowfcuiqbvfkwjxb`
- ✅ Vercel MCP conectado desde Cowork
- ✅ GitHub fuera de MCP (decisión "opción b") — `gh` CLI instalado localmente; `.mcp.json` sólo tiene supabase + vercel
- ✅ Migration `fase28_6_rls_policies_cleanup` aplicada (notificaciones granular + drop policies duplicadas custom_fields)
- ✅ Migration `fase28_7a_views_security_invoker` aplicada (8 vistas → SECURITY INVOKER, 8 ERRORs cerrados)
- ✅ Migration `fase28_7b_rls_policies_tightening` aplicada (9 policies granularizadas, 15 WARNs cerrados)
- ✅ Migration `fase28_7c_functions_search_path` aplicada (6 funciones con search_path fijo, 6 WARNs cerrados)
- ✅ Auth password hardening en dashboard: minimum length 12 + lowercase/uppercase/digits/symbols
- ✅ `docs/ARQUITECTURA_PROYECTOS.md` nuevo — mapea CRM + valere-gestion-potencias + futuras apps satélite
- ✅ `docs/SEGURIDAD.md` nuevo — registro de decisiones de seguridad (incluye decisión de no upgrade a Pro por leaked password protection)
- ✅ `docs/MCP_SETUP.md` actualizado para opción b (GitHub vía gh, no MCP)

### Advisors Supabase: 34 → 1
Solo queda `auth_leaked_password_protection` WARN — requiere Pro plan, mitigado con password length + complexity. Decisión documentada en `docs/SEGURIDAD.md` §1.

### Pendientes abiertos
- Localizar repo de `valere-gestion-potencias` (búsqueda GitHub jolivares-valere devuelve solo valere-v2 público → repo privado o local sin subir)
- Carpeta `CRM VALERE/` vacía en mount Cowork — borrar o reutilizar
- Activar Pro plan cuando se escale (desbloquea leaked password protection + PITR)
- PR #5 `claude/mcp-setup` pendiente de merge cuando CI pase



## Rama de desarrollo

`claude/valere-crm-architecture-2vvEV` — PR #1 abierto → main.
HEAD actual: `f0ac5fa`. 27 commits desde la última actualización de este fichero.

## Resumen ejecutivo

CRM + Calculadora fusionados bajo arquitectura feature-based (`src/features/`). **27 fases del roadmap completadas + FASE 28 completa (3 ejes) + FASE 28.1–28.5 hardening y polish**. TSC 0 errores · 39/39 tests · build OK.

**Audit completo 2026-04-19:** 0 P0 pendientes · 0 P1 pendientes. Consolidado en `docs/AUDIT_2026-04-19.md`.

**DROP legacy ejecutado 2026-04-21**: Cowork dropeó `clients` y `supply_points` en Supabase (datos de PAZ Y BIEN test migrados a empresas). `proposals` (EN) se queda — la usa activamente AnalisisPage/PropuestasEnergiaPage/TrackingPage.

## Commits (sesiones 2026-04-20 y 2026-04-21)

### FASE 28 — Personalización + Eje 1/2/3 (2026-04-20 AM)

| Commit | Qué hace |
|--------|----------|
| `a29ac79` | FASE 28.1 — Refactor 4 features Calculadora → cups/empresas/facturas (adapter pattern) |
| `4aaf82f` | FASE 28 Eje 2 — Dashboards por rol (useDashboardScope + badge visual) |
| `f28d9a3` | FASE 28 Eje 1 — Custom fields (useCustomFields, CustomFieldsPanel, CustomFieldsManager, tab "campos" en empresas y oportunidades) |
| `abff85a` | FASE 28 Eje 3 — Automatizaciones (oportunidad ganada → borrador contrato; contrato activado → tarea 30d) |
| `f51bfc8` | Hardening: role gating /admin, focus trap ConfirmDialog, CSP meta tag |
| `be8585b` | FASE 28.2 fixes post-test Cowork: slug custom fields, profileLoaded flag (fix BUG 5 /admin directo), encoding â€" → —, migration SQL con RLS policies + recrear FKs a user_profiles |
| `2df6d7e` | FASE 28.3: fix automatización ganada→contrato con canonicalEtapa, logger con serializeError (elimina [object Object]), +11 tests (17→28) |
| `29d2eff` | FASE 28.4: eliminar etapas legacy del form de oportunidades; normalizarEtapa() convierte legacy→canónica al cargar |
| `c9e2594` | CI de GitHub Actions (tsc + test + build) + ESTADO.md |
| `a40634e` | Persistir fix get_user_rol() (master/manager → admin) en migration fase28.2 |
| `6c5d9aa` | Handoff doc `docs/HANDOFF_2026-04-20.md` |
| `9f22a8c` | Informe de diseño `docs/DESIGN_REVIEW_2026-04-20.md` (hallazgos priorizados en 3 sprints) |
| `79a7b6b` | Referenciar informe de diseño desde handoff |

### Integración Datadis + sistema multi-agente (2026-04-22 Cowork)

| Commit | Qué hace |
|--------|----------|
| `29b3e97` | Sprint 2 parte 3: skeleton DatosPage facturas + ESTADO.md |
| `8073c71` | feat(agentes): sistema multi-agente + CLAUDE.md actualizado + Datadis integration (service, hooks, panel, migration) |

### Sprint 2 visual (2026-04-22 autónomo)

| Commit | Qué hace |
|--------|----------|
| `0c6eea2` | Sprint 2 parte 1: toasts faltantes (useUpdateEtapa, useToggleTareaCompletada, useMarcarTodasLeidas) + skeletons en PropuestasEnergiaPage y TrackingPage + badges inline de ActividadesPage y Dashboard → StatusBadge + eliminar interface `Client` legacy (0 consumidores tras DROP) |
| `3422117` | Sprint 2 parte 2: skeletons en AdminPage (3 tabs) + CustomFieldsManager |
| `TBD` | Sprint 2 parte 3: skeleton en DatosPage listado de facturas + actualización ESTADO.md |

### FASE 28 continuación — Sprint 1 A11y + Sprint 2 visual + DROP legacy (2026-04-21)

| Commit | Qué hace |
|--------|----------|
| `5b7d0ff` | Sprint 1 accesibilidad: 5 confirm() nativos → ConfirmDialog, aria-labels + focus-visible, bonus OffersTab con confirmación |
| `b1169f5` | README deploy Edge Function `chat-consultor` (código ya hardeniado: JWT + CORS + validación) |
| `f855890` | +11 tests de hooks (useAutomatizaciones + useCustomFields, total 28→39) + dashboard tokens valere (bg-valere-blue vs bg-blue-500 decorativos) |
| `359a0fb` | BUG 6 (fecha display) + aria-labels contextuales en contactos/contratos/incidencias/renovaciones/documentos + NotificationBell aria-expanded/haspopup |
| `6905bd4` | `docs/LEGACY_TABLES_KILL_LIST.md` + test refuerzo BUG 6 (fecha_actividad ≠ fecha_vencimiento) |
| `d665f24` | Frontend pre-DROP: elimina fallback `supply_points?.clients?.company_name` en TrackingPage y PropuestasEnergiaPage |
| `397fdc1` | **TAREA 2 unificación visual**: rounded-md/lg → rounded-xl en 11 features CRM, H1 homologados al estilo Calc, StatusBadge genérico con 7 variantes semánticas, migración de EstadoBadge + IncidenciasPage + RenovacionesPage |
| `d90a97a` | BUG 7 migration SQL (FK eventos.asignado_a — fallará y se corrige en f0ac5fa) + rounded-md residuales (ExportButton, Sidebar, ConfirmDialog, LoginPage, GlobalSearch, Skeleton, DocumentosTab) |
| `7f38b2b` | Post-DROP: limpiar tipos TS (`src/core/types/database.ts` -145 líneas, 0 refs a clients/supply_points) |
| `f0ac5fa` | **BUG 7 corregido**: la columna real es `usuario_id` (no `asignado_a`). Migration + interface Evento + useEventosEnRango + EventoForm alineados al schema real |

## Fases completadas (27/27 + FASE 28)

*(FASE 20–27 igual que antes)*

### FASE 28 — Personalización ✅

| Eje | Descripción | Estado |
|-----|-------------|--------|
| **28.1** | Refactor 4 features Calculadora → `cups/empresas/facturas` | ✅ |
| **Eje 2** | Dashboards por rol: `useDashboardScope` filtra por `comercial_id`; master/manager ven todo; badge visual en header | ✅ |
| **Eje 1** | Custom fields: admin define campos por entidad (empresa/oportunidad/contacto/contrato); comerciales rellenan en la ficha | ✅ |
| **Eje 3** | Automatizaciones: oportunidad `cerrada_ganada` → auto-borrador contrato; contrato `activo` → auto-tarea seguimiento 30d | ✅ |

## Hardening aplicado (2026-04-20)

| Mejora | Archivo | Estado |
|--------|---------|--------|
| Role gating `/admin` — solo `master`/`manager` | `App.tsx`, `Sidebar.tsx` | ✅ |
| Focus trap en ConfirmDialog (Tab cíclico, restore foco) | `ConfirmDialog.tsx` | ✅ |
| CSP meta tag (default-src 'self', Supabase WSS, Fonts, Gemini) | `index.html` | ✅ |

## Archivos clave nuevos (FASE 28)

| Archivo | Propósito |
|---------|-----------|
| `src/core/hooks/useCustomFields.ts` | CRUD hooks para custom_fields_schema + values |
| `src/core/hooks/useAutomatizaciones.ts` | useCrearContratoDesdeOportunidad + useCrearTareaDesdeContrato |
| `src/core/components/CustomFieldsPanel.tsx` | Render/edit genérico para valores de campos personalizados |
| `src/features/admin/components/CustomFieldsManager.tsx` | UI admin para definir campos personalizados por entidad |
| `src/core/energia/adapters.ts` | cupsToSupplyPoint, supplyPointFormToCupsPayload, empresaToClient |

## Pendientes (NO bloqueantes)

| Tarea | Bloqueador | Urgencia |
|-------|-----------|---------|
| ~~Ejecutar SQL fase28.5 corregido (FK eventos_usuario_id_fkey, BUG 7)~~ | ~~Cowork aplicó 2026-04-21 y verificó end-to-end~~ | ✅ Cerrado |
| ~~Sprint 2 del informe de diseño: toasts + skeletons + badges inline~~ | ~~Aplicado 2026-04-22 (commits 0c6eea2, 3422117)~~ | ✅ Cerrado |
| ~~Policies granulares para `notificaciones`~~ | ~~Migration `fase28.6` preparada~~ | ✅ Ejecutado en Supabase 2026-04-22 |
| ~~Retirar policies duplicadas `cfs_admin/cfv_admin`~~ | ~~Incluido en `fase28.6`~~ | ✅ Ejecutado en Supabase 2026-04-22 |
| ~~Integración Datadis~~ | ~~Migration + service + hooks + panel~~ | ✅ Completo 2026-04-22 |
| Regenerar tipos TypeScript con `supabase gen types` automático | Requiere `SUPABASE_ACCESS_TOKEN` en harness | Baja |
| Deploy Edge Function `chat-consultor` | CLI: `supabase functions deploy chat-consultor` + secrets GEMINI_API_KEY/ALLOWED_ORIGIN | Media |
| ~~Retirar policies duplicadas `cfs_admin/cfv_admin` (duplicado arriba)~~ | Incluido en `fase28.6` | ✅ Código listo |
| Tipos legacy `Client`/`SupplyPoint` en `src/types/database.ts` | Sin consumidores tras el DROP; eliminar en sprint dedicado | Baja |
| Testar CSP en dev (`npm run dev`) | Si algo falla: aflojar `connect-src` o `script-src` | Baja |

## Acciones completadas esta semana (2026-04-20/21)

- ✅ FASE 28 Eje 1 (Custom fields), Eje 2 (Dashboards por rol), Eje 3 (Automatizaciones)
- ✅ Sprint 1 a11y del informe de diseño (ConfirmDialog, aria-labels, focus-visible)
- ✅ TAREA 2 escuela visual rounded-xl unificada + H1 homologados + StatusBadge genérico
- ✅ DROP `clients` + `supply_points` ejecutado por Cowork en Supabase (2026-04-21)
- ✅ Tipos TS limpiados post-DROP (-145 líneas en database.ts)
- ✅ Migration fase28.2: RLS policies para custom_fields + recrear FKs a user_profiles
- ✅ Fix get_user_rol() persistido en migration (master/manager → admin)
- ✅ CI GitHub Actions (tsc + test + build en cada push)
- ⏳ Migration fase28.5: BUG 7 FK eventos.usuario_id — SQL corregido, pendiente ejecución por Cowork

## Re-test Cowork 2026-04-20 (tras aplicar fase28.2 SQL)

| Bloque | Estado |
|--------|--------|
| A — Custom fields (crear/editar/guardar/toggle) | ✅ PASA (tras fix RLS adicional: get_user_rol() mapea master/manager → 'admin') |
| B — Automatización ganada→contrato | ⚠️ Pendiente re-test tras commit 2df6d7e (canonicalEtapa fix) |
| B — Automatización contrato activo→tarea | ⚠️ Pendiente (depende de B.1) |
| C — Dashboard badge vista global/personal | ✅ PASA |
| D — /admin directo URL | ✅ PASA (tras commit be8585b profileLoaded) |
| D — CSP sin errores en consola | ✅ PASA |
| Extra — BUG 2 slug autogenera `sector_empresa` | ✅ PASA |
| Extra — encoding placeholders `—` en lugar de `â€"` | ✅ PASA |

### Fix RLS aplicado por Cowork (PERMANENTE, excelente)

```sql
-- Hace que master/manager hereden permisos de admin en las 20 policies existentes
-- sin tocarlas una a una. También beneficia a policies futuras.
CREATE OR REPLACE FUNCTION public.get_user_rol() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT CASE
    WHEN (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('master', 'manager') THEN 'admin'
    ELSE (SELECT role FROM user_profiles WHERE id = auth.uid())
  END;
$$;
```

## Estado de las tablas

| Tabla | Estado | Notas |
|-------|--------|-------|
| `user_profiles` | ✅ activa | Canónica |
| `empresas` | ✅ activa | |
| `cups` | ✅ activa | |
| `facturas` | ✅ activa | Renombrada de invoice_history |
| `clients` | ❌ DROPPED | Cowork 2026-04-21. Fallback eliminado en frontend previamente. |
| `supply_points` | ❌ DROPPED | Cowork 2026-04-21. Ídem. |
| `proposals` (Calc EN) | ✅ activa | NO dropear: uso activo en AnalisisPage (insert) + PropuestasEnergiaPage/TrackingPage (listados). Vacía en prod hoy. |
| `custom_fields_schema` | ✅ activa | UI implementada en admin |
| `custom_fields_values` | ✅ activa | UI implementada en fichas. Unique index (schema_id, entidad_id) en fase28.2 |
| `contratos` | ✅ activa | |
| `oportunidades` | ✅ activa | |
| `incidencias` | ✅ activa | |
| `renovaciones` | ✅ activa | |
| `actividades` | ✅ activa | |
| `documentos` (tabla + bucket) | ✅ activa | |
| `eventos` | ✅ activa | Columna real: `usuario_id` (no `asignado_a` como asumió el código originalmente). FK pendiente de aplicar con fase28.5. |

## Migrations aplicadas en Supabase

- `20260418_fase20.9_rls_granular.sql`: RLS granular para 11 tablas CRM, helper `is_manager_or_above()`.
- `20260419_fase28_1b_cups_id_fk.sql`: `cups_id` FK en facturas y proposals (FASE 28.1).
- `20260420_fase28_2_fixes_rls_fks.sql`: RLS custom_fields, recrear FKs a user_profiles (16 tablas), mapeo `get_user_rol()` → 'admin' para master/manager. ✅ Cowork aplicó 2026-04-20.
- DROP manual: `clients`, `supply_points` + 2 DELETE previos del registro PAZ Y BIEN test. ✅ Cowork aplicó 2026-04-21. 60 → 52 policies tras CASCADE.
- `20260421_fase28_5_fk_eventos_asignado_a.sql`: FK `eventos.usuario_id` → `user_profiles(id)` (corrigió asunción inicial de `asignado_a`). ✅ Cowork aplicó 2026-04-21. BUG 7 cerrado end-to-end (verificado `/calendario` sin PGRST200).
- `20260422_fase28_6_rls_policies_cleanup.sql`: policies granulares para `notificaciones` + limpieza de policies duplicadas. ✅ Ejecutado en Supabase 2026-04-22.
- `20260422_datadis_integracion.sql`: columnas datadis_* en cups + tabla datadis_tokens + tabla datadis_consumptions + RLS granular. ✅ Ejecutado en Supabase 2026-04-22.

## Cómo arrancar una nueva sesión

### Claude Code (CLI/Desktop)
```bash
cd ~/valere-v2 && claude -c
```

### Claude Cowork (Web — claude.ai/code)
```
Trabajas en valere-v2, rama claude/valere-crm-architecture-2vvEV.
git pull origin claude/valere-crm-architecture-2vvEV
cat CLAUDE.md docs/ESTADO.md
ls .cowork/outbox/ .cowork/inbox/
git log --oneline -10
```


## Rama de desarrollo

`claude/valere-crm-architecture-2vvEV` — **88 commits ahead de `main`**.

## Resumen ejecutivo

CRM + Calculadora fusionados bajo arquitectura feature-based (`src/features/`). **27 de 27 fases del roadmap completadas** (código + SQL) + 2 mejoras de plataforma (code-splitting, Vitest). TSC 0 errores · 17/17 tests · build OK (253 kB main).

**Audit completo 2026-04-19 (3 agentes):** Cowork (backend/DB) + Claude Code (frontend/UX/security) + Security Reviewer.
- Resultado: ✅ 0 P0 pendientes · ✅ 0 P1 pendientes · 2 P2 (info)
- Consolidado en: `docs/AUDIT_2026-04-19.md` (commit 3fa667c)

## Fases completadas (27/27 + 2 mejoras plataforma)

| FASE | Descripción | Tipo |
|---|---|---|
| 20.0–20.6 | Fusión CRM+Calc, migrar módulos, unificar auth, eliminar legacy | Arquitectura |
| 20.7.a | users_profile merge → no-op (ya era user_profiles) | SQL ✅ |
| 20.7.b | clients → empresas (1 fila: PAZ Y BIEN 5002AP) | SQL ✅ |
| 20.7.c | supply_points → cups (1 fila migrada, contrato_id nullable) | SQL ✅ |
| 20.7.d | invoice_history → facturas (rename) | SQL ✅ |
| 20.8 | Edge Function chat-consultor + refactor ChatIAPanel (API key fuera del cliente) | Feature + SQL ✅ |
| 20.9 | RLS granular multitenant (SQL creado, no aplicado) | SQL ✅ |
| 20.10 | Audit: ediciones, autoprefixer, shadcn config | Limpieza |
| 21.a | Pipeline energético: Kanban 8 etapas, ahorro anual, probabilidades | Feature + SQL ✅ |
| 21.b | Alertas vencimiento contratos: semáforo + widget dashboard | Feature + SQL ✅ |
| 21.c | Timeline actividades en fichas empresa y contrato | Feature |
| 22 | Incidencias: tabla + listado + filtros + KPI | Feature + SQL ✅ |
| 23 | Renovaciones: tabla + listado + filtros + KPI | Feature + SQL ✅ |
| 24 | Documentos/Storage: tabla + upload/download + DocumentosTab | Feature + SQL ✅ |
| 25 | Notificaciones in-app con badge en header | Feature |
| 26.a | Exportación CSV en todos los listados | Feature |
| 26.b | Informes predefinidos (comercial mensual + cartera activa) | Feature |
| 27 | Calendario/Agenda: tabla eventos + vista mes + CRUD | Feature + SQL ✅ |
| Plataforma | Code-splitting React.lazy + Vitest + 17 tests | Calidad |
| Audit P0/P1 | useAuth StrictMode + signed URLs + navegación + UX | Fix |

## Fixes aplicados en audit 2026-04-19

| Fix | Estado |
|-----|--------|
| P0.1: Bucket `documentos` creado (50MB, private, 4 policies) | ✅ HECHO |
| P0.2: RLS incidencias+renovaciones `public→authenticated` | ✅ HECHO |
| P1.1: 10 tablas con trigger `updated_at` aplicado | ✅ HECHO |
| P1.2: 3 índices creados (eventos, notificaciones, oportunidades) | ✅ HECHO |
| P1.3: cups RLS policy NULL support | ✅ HECHO |
| Security: Edge Function JWT+CORS+rate-limit hardening | ✅ HECHO |
| Security: sanitize file extension upload | ✅ HECHO |
| Security: VITE_GEMINI_API_KEY eliminado de .env.example | ✅ HECHO |
| 3 console.error → logError | ✅ HECHO |

## Tareas pendientes antes de FASE 28 personalización

| Tarea | Bloqueador | Urgencia |
|-------|-----------|---------|
| Deploy Edge Function chat-consultor | CLI: `supabase functions deploy chat-consultor` | Alta |
| Secrets Supabase | `supabase secrets set GEMINI_API_KEY=<valor> ALLOWED_ORIGIN=<url>` | Alta |
| **FASE 28.1a** — Refactor 4 features Calculadora → empresas/cups | Claude Code (próxima sesión) | Alta |
| **FASE 28.1b** — Migración datos + ACK DROP legacy | Cowork + Claude Code + ACK cruzado | Media |
| Regenerar tipos TypeScript | `npx supabase gen types typescript` | Baja |

## Próximas fases

| FASE | Descripción | ETA |
|------|-------------|-----|
| **28.1a** | Refactor Calculadora: DatosPage, AnalisisPage, TrackingPage, PropuestasEnergiaPage → `empresas/cups` | Próxima sesión Claude Code |
| **28.1b** | Migración datos residuales clients→empresas + ACK DROP + DROP legacy | Sesión Cowork siguiente |
| **28** | Personalización: custom fields, dashboards por rol, automatizaciones flujo | Post 28.1 |

## Ejes de personalización FASE 28 (priorizados por valor)

| Eje | Descripción | Complejidad |
|-----|-------------|-------------|
| Custom fields en empresas + oportunidades | Campos propios por consultoría (tarifa habitual, clasificación, próximo contacto...) | Media — tabla `custom_fields_schema` ya existe |
| Dashboards por rol | Comercial: sus oportunidades + pipeline + vencimientos. Jefe equipo: equipo. Admin: todo | Baja-Media — widgets ya existen, filtrar por rol |
| Automatizaciones de flujo | Oportunidad ganada→contrato automático. Contrato firmado→actividad 30d. Alerta 60d vencimiento | Media-Alta — triggers SQL o tabla de reglas |

## Estado de las tablas

| Tabla | Estado | Filas | Notas |
|-------|--------|-------|-------|
| `user_profiles` | ✅ activa | 1 | Nombre correcto |
| `empresas` | ✅ activa | 1 | PAZ Y BIEN 5002AP migrada |
| `clients` | ⚠️ legacy | 1 | DROP bloqueado — 4 features Calculadora leen de ella (FASE 28.1) |
| `cups` | ✅ activa | 1 | CUPS migrado; contrato_id nullable; policy NULL fix ✅ |
| `supply_points` | ⚠️ legacy | 1 | DROP bloqueado — 4 features Calculadora leen de ella (FASE 28.1) |
| `facturas` | ✅ activa | 1 | Renombrada desde invoice_history |
| `invoice_history` | ❌ eliminada | - | Renombrada a facturas |
| `oportunidades` | ✅ activa | 1 | Pipeline energético |
| `eventos` | ✅ activa | 0 | FASE 27 — sin datos aún |
| `incidencias` | ✅ activa | ? | RLS fixed ✅ |
| `renovaciones` | ✅ activa | ? | RLS fixed ✅ |
| `documentos` (tabla) | ✅ activa | 0 | FASE 24 |
| `documentos` (bucket) | ✅ activa | 0 | Creado 2026-04-19, 4 policies |

## Archivos clave

| Archivo | Propósito |
|---|---|
| `CLAUDE.md` | Contexto del proyecto — ambos Claudes lo leen al arrancar |
| `docs/ROADMAP_FUSION.md` | Roadmap detallado con checklists |
| `docs/ESTADO.md` | **Este fichero** — estado en tiempo real |
| `docs/AUDIT_2026-04-19.md` | Audit completo (3 agentes) — 0 P0, 0 P1 pendientes |
| `docs/BACKUP_PROTOCOL.md` | Protocolo de backup + prompt inicio sesión + reglas críticas |
| `.cowork/inbox/2026-04-19T24-00-00-bucket-documentos-creado.md` | Confirmación P0.1 cerrado |

## Cómo arrancar una nueva sesión

### Claude Cowork (Web — claude.ai/code)
```
Trabajas en valere-v2, rama claude/valere-crm-architecture-2vvEV.
Ejecuta:
git pull origin claude/valere-crm-architecture-2vvEV
cat CLAUDE.md docs/ESTADO.md
ls .cowork/outbox/ .cowork/inbox/
git log --oneline -10
Lee todo y dime dónde nos quedamos. Continúa desde ahí.
```

### Claude Code (CLI/Desktop)
```bash
cd ~/valere-v2 && claude -c
```

