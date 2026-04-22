-- FASE 21.b — Alertas de vencimiento de contratos
CREATE OR REPLACE VIEW public.contratos_por_vencer AS
SELECT
  c.id,
  c.numero_contrato,
  c.empresa_id,
  c.fecha_fin,
  (c.fecha_fin - current_date)::int AS dias_restantes,
  CASE
    WHEN (c.fecha_fin - current_date) <= 15 THEN 'critica'
    WHEN (c.fecha_fin - current_date) <= 30 THEN 'proxima'
    ELSE 'futura'
  END AS estado_alerta,
  e.nombre AS empresa_nombre
FROM public.contratos c
JOIN public.empresas e ON e.id = c.empresa_id
WHERE c.deleted_at IS NULL
  AND c.fecha_fin IS NOT NULL
  AND c.fecha_fin >= current_date
  AND c.fecha_fin <= current_date + INTERVAL '90 days'
ORDER BY c.fecha_fin ASC;

CREATE OR REPLACE FUNCTION public.get_resumen_vencimientos(
  p_comercial_id uuid DEFAULT NULL
)
RETURNS TABLE (criticas int, proximas int, futuras int, total int)
LANGUAGE sql SECURITY INVOKER STABLE
AS $$
  SELECT
    COUNT(*) FILTER (WHERE v.estado_alerta = 'critica')::int,
    COUNT(*) FILTER (WHERE v.estado_alerta = 'proxima')::int,
    COUNT(*) FILTER (WHERE v.estado_alerta = 'futura')::int,
    COUNT(*)::int
  FROM public.contratos_por_vencer v
  JOIN public.empresas e ON e.id = v.empresa_id
  WHERE p_comercial_id IS NULL OR e.comercial_id = p_comercial_id;
$$;
