# Sprint domingo 2026-04-26 — Lane 1 cerrado: prod apply vía MCP Supabase

**Cuándo**: 2026-04-26, sesión Cowork autónoma (lane 1 de 4 en paralelo).
**Quién**: Cowork (este agente), trabajando en aislamiento sobre `gtphkowfcuiqbvfkwjxb`.
**Restricciones honradas**: NO commits (sandbox no escribe a `.git`), NO toques `src/`, NO toques `docs/` salvo `docs/PROD_APPLY_2026-04-26.md` y `docs/SUPABASE_*` (no añadidos), NO toques `.cowork/AGENT_PLAYBOOK.md`. Migrations applied previas, intactas.

## Lo aplicado

1. **Edge Function `ask-crm-docs` v9 → v10** (umbral de similitud, §1 de `docs/PATCH_ASISTENTE_RAG_2026-04-25.md`).
   - `STRICT_MIN_SIMILARITY=0.50` (sin LLM si por debajo) y `MIN_SIMILARITY=0.62` (encontrada_respuesta=true si por encima).
   - §2 (normalizar pregunta TS) saltado: `crm_asistente_log.pregunta_normalizada` ya es columna GENERATED en BD.
   - Validado end-to-end con 4 queries reales (user temp creado/borrado vía SQL admin). Test off-topic fuerte: 335 ms, sin LLM, `no_match: true`. Detalle en §1 de `docs/PROD_APPLY_2026-04-26.md`.

2. **3 migrations RLS** aplicadas vía `mcp__apply_migration` (todas success):
   - `20260426_drop_redundant_authenticated_select_policies_2026_04_26` — 6 SELECT duplicadas borradas.
   - `20260426_convert_all_policies_to_granular_2026_04_26` — 12 tablas: `cmd=ALL` → granular `INSERT/UPDATE/DELETE`. Drop catch-all `documentos_all_authenticated`. `auth.uid()` ya envuelto en las nuevas.
   - `20260426_initplan_optimization_remaining_2026_04_26` — 16 ALTER POLICY: `auth.uid()/auth.role()` envueltos en `(select …)`.

3. **Advisors**: 162 → 88 (–46 %). `multiple_permissive_policies` 35→0, `auth_rls_initplan` 23→0, `unused_index` 41→34 (efecto colateral).

## Lo NO aplicado (intencional)

- **RLS hardening 8 tablas** (`alertas`, `ciclos`, `comercializadora_docs`, `comunicaciones_cliente`, `excel_import_templates`, `expedientes`, `savings_calculations`, `solicitudes_potencia`).
  - Archivo `supabase/migrations/_draft_rls_hardening_8_tables.sql` **renombrado** a `supabase/migrations/_pending_rls_hardening_8_tables.sql` con cabecera explicando 3 preguntas pendientes para Juan.
  - Bloqueo: si los datos importados de Potencias no traen `created_by` poblado, el patrón "creador o manager+" puede impedir flujos legítimos del rol comercial.
  - Si Juan dice OK: aplicar el contenido del archivo via `mcp__apply_migration name='rls_hardening_8_tables_<fecha>'` y renombrar a `20260xxx_rls_hardening_8_tables.sql`.

- **`auth_leaked_password_protection`**: toggle en Dashboard (Auth → Settings), fuera del scope SQL. 1 click.

- **Indices `unindexed_foreign_keys` (45)** y **drop `unused_index` (34)**: el auditor recomienda esperar a post-Fase-2 + 1 mes de tráfico real.

## Para Juan

1. Cuando vuelvas a una sesión normal, ejecutar:
   ```bash
   cd ~/valere-v2
   git status                                     # debe mostrar:
   #   modified:   supabase/functions/ask-crm-docs/index.ts
   #   new file:   docs/PROD_APPLY_2026-04-26.md
   #   renamed:    supabase/migrations/_draft_rls_hardening_8_tables.sql →
   #               supabase/migrations/_pending_rls_hardening_8_tables.sql
   git add supabase/functions/ask-crm-docs/index.ts \
           supabase/migrations/_pending_rls_hardening_8_tables.sql \
           docs/PROD_APPLY_2026-04-26.md
   git rm   supabase/migrations/_draft_rls_hardening_8_tables.sql 2>/dev/null || true
   git commit -m "feat(asistente+rls): aplicar v10 umbral + 3 migrations RLS hardening (sprint domingo lane 1)"
   git push origin main
   ```
2. Si quieres responder a las 3 preguntas del header de `_pending_rls_hardening_8_tables.sql`, dejarlo apuntado y un sprint futuro lo aplica.
3. Activar `auth_leaked_password_protection` en Dashboard cuando tengas 30 segundos.

## Para sesiones futuras (Cowork/Code/cualquiera)

- Migration `dropear_unused_index` y crear FK indices: solo después de Fase 2 + 1 mes de tráfico. Plan en `docs/SUPABASE_AUDITORIA_ADVISORS_2026-04-25.md` §4-5.
- Asistente RAG: vigilar `crm_asistente_log` la semana que viene; el ratio `con_respuesta/total` ya no debería ser 100 % (era el síntoma del bug). Queries en §6 de `docs/PROD_APPLY_2026-04-26.md`.

## No tocado

- `src/`, `docs/ESTADO.md`, `docs/SESIONES/`, `.cowork/inbox/`, `.cowork/AGENT_PLAYBOOK.md` — explícitamente fuera del scope del lane 1.
