-- ═══════════════════════════════════════════════════════════════════
-- PENDIENTE DECISIÓN JUAN — Hardening RLS 8 tablas USING(true)
-- ═══════════════════════════════════════════════════════════════════
--
-- ⚠️  NO APLICADA EN PROD. El sprint del domingo 2026-04-26 (lane 1)
--     explícitamente saltó esta migration. Las 8 tablas (alertas, ciclos,
--     comercializadora_docs, comunicaciones_cliente, excel_import_templates,
--     expedientes, savings_calculations, solicitudes_potencia) siguen
--     con `X_authenticated_all USING(true) WITH CHECK(true)`.
--
-- BLOQUEO: Juan AÚN no ha decidido si acepta el riesgo de los comerciales
-- post-Fase-2 (cuando los datos reales de Potencias estén importados).
-- El patrón granular de abajo cierra el acceso write a "creador o
-- manager+", lo que puede impedir flujos legítimos del rol "comercial" si:
--   - los datos importados de Potencias no traen `created_by` poblado
--   - o si el comercial necesita modificar registros que no creó él
--
-- DECISIÓN PENDIENTE Juan (responder antes de aplicar):
--   1) ¿OK que un comercial NO pueda editar `expedientes`/`ciclos` ajenos?
--   2) ¿OK que solo manager+ pueda crear `comercializadora_docs` y
--      `excel_import_templates`?
--   3) ¿OK el caso especial `alertas` donde cualquier authed puede marcar leída?
--
-- TRÁMITE PARA APLICAR (cuando Juan diga sí):
--   1) Validar con un user comercial real (post-Fase-2) que puede operar
--      normalmente: leer expedientes asignados + crear sus propios ciclos.
--   2) `mcp__apply_migration` con name='rls_hardening_8_tables_<fecha>'
--      y este contenido como query (sin BEGIN/COMMIT).
--   3) Verificar advisors: las 8 WARN `rls_policy_always_true` deben ir a 0.
--   4) Renombrar este archivo a `20260xxx_rls_hardening_8_tables.sql`.
--
-- Estado advisors al cerrar sprint domingo 2026-04-26 lane 1:
--   - 8 WARN `rls_policy_always_true` siguen activos en estas 8 tablas.
--   - +1 WARN `auth_leaked_password_protection` (toggle dashboard, fuera SQL).
--   - Total security WARN = 9 (sin cambio respecto al snapshot inicial).
--
-- Patrón propuesto:
--   - SELECT abierto a authed (info compartida del equipo Valere)
--   - INSERT/UPDATE/DELETE solo creador o manager+
-- ═══════════════════════════════════════════════════════════════════

-- ───────── expedientes (potencias) ─────────
drop policy if exists expedientes_authenticated_all on public.expedientes;
create policy expedientes_select on public.expedientes for select to authenticated using (true);
create policy expedientes_insert on public.expedientes for insert to authenticated with check (
  created_by = auth.uid() or public.is_manager_or_above()
);
create policy expedientes_update on public.expedientes for update to authenticated
  using (created_by = auth.uid() or public.is_manager_or_above())
  with check (created_by = auth.uid() or public.is_manager_or_above());
create policy expedientes_delete on public.expedientes for delete to authenticated
  using (public.is_manager_or_above());

-- ───────── ciclos ─────────
drop policy if exists ciclos_authenticated_all on public.ciclos;
create policy ciclos_select on public.ciclos for select to authenticated using (true);
create policy ciclos_insert on public.ciclos for insert to authenticated with check (
  exists (select 1 from public.expedientes e where e.id = expediente_id and (e.created_by = auth.uid() or public.is_manager_or_above()))
);
create policy ciclos_update on public.ciclos for update to authenticated
  using (exists (select 1 from public.expedientes e where e.id = expediente_id and (e.created_by = auth.uid() or public.is_manager_or_above())))
  with check (exists (select 1 from public.expedientes e where e.id = expediente_id and (e.created_by = auth.uid() or public.is_manager_or_above())));
create policy ciclos_delete on public.ciclos for delete to authenticated
  using (public.is_manager_or_above());

-- ───────── solicitudes_potencia ─────────
drop policy if exists solicitudes_potencia_authenticated_all on public.solicitudes_potencia;
create policy solicitudes_potencia_select on public.solicitudes_potencia for select to authenticated using (true);
create policy solicitudes_potencia_insert on public.solicitudes_potencia for insert to authenticated with check (
  created_by = auth.uid() or public.is_manager_or_above()
);
create policy solicitudes_potencia_update on public.solicitudes_potencia for update to authenticated
  using (created_by = auth.uid() or public.is_manager_or_above())
  with check (created_by = auth.uid() or public.is_manager_or_above());
create policy solicitudes_potencia_delete on public.solicitudes_potencia for delete to authenticated
  using (public.is_manager_or_above());

-- ───────── savings_calculations ─────────
drop policy if exists savings_calculations_authenticated_all on public.savings_calculations;
create policy savings_calculations_select on public.savings_calculations for select to authenticated using (true);
-- Solo lectura para usuarios normales — los inserts los hace el sistema (Edge Function / backend job)
create policy savings_calculations_write on public.savings_calculations for all to authenticated
  using (public.is_manager_or_above())
  with check (public.is_manager_or_above());

-- ───────── alertas ─────────
drop policy if exists alertas_authenticated_all on public.alertas;
create policy alertas_select on public.alertas for select to authenticated using (true);
create policy alertas_update_leida on public.alertas for update to authenticated
  using (true)
  with check (true);  -- cualquier authed puede marcar leída/no-leída
create policy alertas_insert on public.alertas for insert to authenticated with check (public.is_manager_or_above());
create policy alertas_delete on public.alertas for delete to authenticated using (public.is_manager_or_above());

-- ───────── comunicaciones_cliente ─────────
drop policy if exists comunicaciones_cliente_authenticated_all on public.comunicaciones_cliente;
create policy comunicaciones_cliente_select on public.comunicaciones_cliente for select to authenticated using (true);
create policy comunicaciones_cliente_insert on public.comunicaciones_cliente for insert to authenticated with check (
  enviado_por = auth.uid() or public.is_manager_or_above()
);
create policy comunicaciones_cliente_update on public.comunicaciones_cliente for update to authenticated
  using (enviado_por = auth.uid() or public.is_manager_or_above())
  with check (enviado_por = auth.uid() or public.is_manager_or_above());
create policy comunicaciones_cliente_delete on public.comunicaciones_cliente for delete to authenticated
  using (public.is_manager_or_above());

-- ───────── comercializadora_docs ─────────
drop policy if exists comercializadora_docs_authenticated_all on public.comercializadora_docs;
create policy comercializadora_docs_select on public.comercializadora_docs for select to authenticated using (true);
create policy comercializadora_docs_write on public.comercializadora_docs for all to authenticated
  using (public.is_manager_or_above())
  with check (public.is_manager_or_above());

-- ───────── excel_import_templates ─────────
drop policy if exists excel_import_templates_authenticated_all on public.excel_import_templates;
create policy excel_import_templates_select on public.excel_import_templates for select to authenticated using (true);
create policy excel_import_templates_write on public.excel_import_templates for all to authenticated
  using (public.is_manager_or_above())
  with check (public.is_manager_or_above());

-- ═══════════════════════════════════════════════════════════════════
-- Verificación post-aplicación (correr aparte):
-- ═══════════════════════════════════════════════════════════════════
-- SELECT count(*) FROM pg_policies WHERE schemaname='public' AND qual='true' AND cmd != 'SELECT';
-- → Debe dar 0 (ninguna política write con USING(true)).
--
-- Y un test funcional con un user comercial real:
-- SET ROLE authenticated; SET request.jwt.claim.sub = '<uuid de un comercial>';
-- INSERT INTO expedientes (...) -- debe fallar si created_by != ese uuid y rol != manager+
-- ═══════════════════════════════════════════════════════════════════
