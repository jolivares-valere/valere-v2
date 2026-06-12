-- FASE 0b — Endurecimiento de seguridad (aplicada en prod el 2026-06-11 vía MCP)
-- Origen: docs/ANALISIS_ESTRATEGICO_2026-06-10.md §2.2 + advisor de Supabase (83 avisos → objetivo <50)
-- Aplicada en 3 migraciones MCP: fase0_hardening_funciones_anon_searchpath,
-- fase0_views_security_invoker, fase0_revoke_public_grant_explicito.
-- Este fichero las consolida para que el repo refleje el estado real de prod.

-- 1. Revocar EXECUTE de anon en TODAS las funciones del schema public
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS fn
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', r.fn);
  END LOOP;
END $$;

-- 2. Revocar EXECUTE de authenticated en funciones de cron/worker
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS fn
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('cleanup_pending_users_older_than_7_days','cleanup_datadis_cache','cleanup_datadis_proxy_cache','holded_dispatch_worker')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', r.fn);
  END LOOP;
END $$;

-- 3. search_path fijo en las funciones señaladas por function_search_path_mutable
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS fn
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('normaliza_nif_cif','valida_nif_cif','clasifica_nif_cif','cleanup_datadis_cache',
        'cleanup_datadis_proxy_cache','fv_set_actualizado_en','fv_notificar_informe_pendiente','fv_estado_sesion',
        'update_updated_at_column','fv_credenciales_touch','holded_mask_iban','holded_set_updated_at',
        'fv_upsert_planta','holded_mask_nif','fv_is_admin','set_datadis_cache_updated_at')
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', r.fn);
  END LOOP;
END $$;

-- 4. Vistas con security_invoker (respetan el RLS del consultante)
ALTER VIEW public.retailer_offers SET (security_invoker = true);
ALTER VIEW public.fv_credenciales_safe SET (security_invoker = true);
ALTER VIEW public.fv_sync_health_latest SET (security_invoker = true);

-- 5. Eliminar herencia PUBLIC y conceder EXECUTE explícito
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS fn, p.proname
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('actualizar_lead_captacion','crear_lead_captacion','convertir_prospecto_a_cliente',
        'publish_oferta_with_versioning','fv_upsert_planta','fv_is_admin','user_has_funcion','audit_log_insert',
        'trg_audit_log','enforce_oportunidad_contexto_coherence',
        'cleanup_datadis_cache','cleanup_datadis_proxy_cache')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', r.fn);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', r.fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.fn);
    IF r.proname IN ('actualizar_lead_captacion','crear_lead_captacion','convertir_prospecto_a_cliente',
        'publish_oferta_with_versioning','fv_upsert_planta','fv_is_admin','user_has_funcion','audit_log_insert') THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.fn);
    END IF;
  END LOOP;
END $$;

-- Resultado verificado 2026-06-11: 0 funciones SECURITY DEFINER ejecutables por anon;
-- advisor 83 → ~35 avisos; 0 ERRORs.
-- PENDIENTE (no automatizable por SQL): activar "Leaked password protection"
-- en Dashboard → Authentication → Settings.