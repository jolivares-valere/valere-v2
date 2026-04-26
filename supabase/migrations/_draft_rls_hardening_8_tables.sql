-- ═══════════════════════════════════════════════════════════════════
-- DRAFT — Hardening RLS para las 8 tablas con USING(true)
-- ═══════════════════════════════════════════════════════════════════
-- NO aplicada todavía. Esperando a que Fase 2 (datos) esté completa
-- y a revisión Juan. El patrón sigue las decisiones del CRM:
--   - SELECT abierto a authed (info compartida del equipo Valere)
--   - INSERT/UPDATE/DELETE solo creador o manager+
--
-- Sustituye las USING(true) policies actuales (alertas_authenticated_all etc.).
--
-- Aplicar via: mcp__apply_migration con name = "rls_hardening_8_tables"
-- y este contenido como query (sin el begin;/commit;).
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
