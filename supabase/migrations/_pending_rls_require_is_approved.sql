-- =============================================================================
-- Migration:  RLS hardening — exigir is_approved=true en políticas permisivas
-- Fecha:      preparada 2026-06-12 (Sprint sprint-domingo-auth-selfsignup)
-- Estado:     PENDIENTE — _pending_ prefix indica que NO se debe aplicar todavía
--
-- POR QUÉ NO ESTÁ APLICADA
--   Aplicar esto ahora bloquearía el acceso a cualquier user_profile que no
--   tenga is_approved=true. Aunque el backfill de 20260612000001 marca a los
--   7 usuarios actuales como is_approved=true, es prudente:
--
--     1. Confirmar con Juan que el backfill cubre todos los humanos activos
--        (ver scripts/auth_backfill_approval.sql + comprobación manual).
--     2. Verificar que ningún Edge Function / cron job clave depende de
--        impersonar a un usuario sin aprobar (ningún cron usa user-context
--        actualmente, todos van por service_role).
--     3. Hacer el corte cuando no haya tráfico crítico.
--
-- CÓMO APLICARLA (cuando Juan dé el go)
--   1. Rename: `mv _pending_rls_require_is_approved.sql 20260613000001_rls_require_is_approved.sql`
--      (ajustar la fecha al día del corte).
--   2. `npx supabase db push` desde local, O
--      Aplicar via MCP `apply_migration` (Cowork puede hacerlo si Juan lo
--      autoriza explícitamente).
--   3. Verificar inmediatamente:
--        SELECT count(*) FROM public.empresas; -- como user no-aprobado debe dar 0
--        SELECT count(*) FROM public.empresas; -- como user aprobado debe dar >0
--
-- ALCANCE
--   Endurece las políticas SELECT/INSERT/UPDATE más permisivas del esquema
--   `public` para que además del check actual (que ya filtra por rol/funciones
--   en muchos casos) exijan que el usuario llamante esté aprobado.
--
--   Estrategia: en lugar de reemplazar cada policy una a una, añadimos una
--   policy ADICIONAL de tipo RESTRICTIVE por tabla. RESTRICTIVE = se aplica
--   en AND con todas las demás, por lo que cualquier policy existente que
--   permita el acceso se ve cortocircuitada si el usuario no está aprobado.
--
--   Esto:
--     - No rompe nada existente (policy aditiva).
--     - Es revertible (DROP de las restrictive policies).
--     - Cubre todas las tablas sin tocar policy por policy.
--
-- ROLLBACK
--   Ver bloque al final.
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper local: lista de tablas a las que aplicar el gate is_approved().
-- Excluimos:
--   - user_profiles (la app necesita leer su propio profile para saber si
--     está aprobado — eso ya está cubierto por una policy SELECT existente).
--   - tablas _migration_* (auxiliares de migraciones, sin tráfico user).
--   - tablas service_role-only (audit_log, asistente_log, etc. — su policy
--     ya es "false" para authenticated).
--   - tablas con datos públicos catalogados (precios_pool_horarios,
--     precios_regulados_boe, datadis_provincias, email_templates).
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_tbl text;
  v_tables text[] := ARRAY[
    -- CRM core
    'empresas','contactos','contratos','cups','oportunidades',
    'actividades','propuestas','custom_fields_schema','custom_fields_values',
    'notificaciones','documentos','eventos',
    -- Calculadora
    'clients','supply_points','invoice_history','retailers','retailer_offers',
    'proposals','global_config','boe_regulated_prices','facturas',
    -- Tarifas / Comercializadoras
    'comercializadoras','comercializadora_ofertas','comercializadora_docs',
    'comercializadora_productos_servicios','oferta_precios_mensuales',
    'tariff_documents','tariff_extractions','tariff_sources','tariff_staging',
    'proposal_email_drafts',
    -- Datadis
    'datadis_tokens','datadis_consumptions','datadis_consumos_cache',
    'datadis_proxy_cache','consentimientos_datadis','datadis_supply_price_terms',
    -- FV / Seguimiento
    'fv_planta','fv_dispositivo','fv_credenciales','fv_planta_credencial',
    'fv_kpi_diario','fv_kpi_realtime','fv_resumen_semanal','fv_alarma',
    'fv_mantenimiento','fv_empresa_mantenimiento','fv_informe_mensual',
    'fv_config_informe','fv_sync_log','fv_sync_audit',
    -- Potencias
    'expedientes','ciclos','solicitudes_potencia','comunicaciones_cliente',
    'alertas','status_log',
    -- Pipeline / Captación
    'incidencias','renovaciones','tareas','oportunidad_emails',
    'oportunidad_handoffs','savings_calculations',
    -- Holded
    'holded_config','holded_conflicts','holded_integration_logs',
    'holded_sync_queue','holded_sync_state',
    -- Asistente
    'crm_help_embeddings'
  ];
BEGIN
  FOREACH v_tbl IN ARRAY v_tables LOOP
    -- Solo si la tabla existe (evita romper si alguna se borra/renombra)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=v_tbl) THEN
      EXECUTE format(
        'DROP POLICY IF EXISTS rls_require_is_approved_select ON public.%I',
        v_tbl
      );
      EXECUTE format(
        'CREATE POLICY rls_require_is_approved_select ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated USING (public.is_approved())',
        v_tbl
      );
      EXECUTE format(
        'DROP POLICY IF EXISTS rls_require_is_approved_modify ON public.%I',
        v_tbl
      );
      EXECUTE format(
        'CREATE POLICY rls_require_is_approved_modify ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_approved()) WITH CHECK (public.is_approved())',
        v_tbl
      );
    END IF;
  END LOOP;
END;
$$;

COMMIT;

-- =============================================================================
-- VERIFICACIÓN POST-APLICACIÓN
-- =============================================================================
-- -- Confirmar que las restrictive policies están en sitio
-- SELECT tablename, policyname, permissive, cmd
-- FROM pg_policies
-- WHERE policyname LIKE 'rls_require_is_approved_%'
-- ORDER BY tablename, policyname;
--
-- -- Probar acceso como usuario aprobado vs pendiente
-- -- (usar 2 cuentas reales con SET LOCAL ROLE / impersonación supabase)

-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- DO $$
-- DECLARE r record;
-- BEGIN
--   FOR r IN SELECT schemaname, tablename, policyname FROM pg_policies
--            WHERE policyname LIKE 'rls_require_is_approved_%' LOOP
--     EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
--   END LOOP;
-- END;
-- $$;
