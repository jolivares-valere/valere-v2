-- Force SECURITY INVOKER en vistas legacy de compat para que respeten RLS del usuario,
-- no del creador. Cierra los 3 ERRORs de security_definer_view.
alter view public.retailers set (security_invoker = on);
alter view public.retailer_offers set (security_invoker = on);
alter view public.boe_regulated_prices set (security_invoker = on);

-- Y la del asistente (mismo problema heredado)
alter view public.crm_asistente_top_no_respondidas set (security_invoker = on);

-- search_path en las funciones legacy
alter function public.legacy_retailers_insert() set search_path = public;
alter function public.legacy_retailer_offers_insert() set search_path = public;
