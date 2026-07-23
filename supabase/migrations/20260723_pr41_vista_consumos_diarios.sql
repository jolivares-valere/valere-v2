-- ═══════════════════════════════════════════════════════════════════
-- PR-4.1 (semana 4) · Vista diaria de consumos para la curva en ficha
-- ═══════════════════════════════════════════════════════════════════
-- datadis_consumptions es horaria (~17k filas por CUPS a 23 meses): traerla
-- entera al navegador no escala. La vista agrega a DÍA (≤ ~700 filas por
-- CUPS) y la UI agrega a MES en cliente (funcion pura testeada).
-- security_invoker=true → la RLS de datadis_consumptions manda (admin o
-- comercial dueño de la empresa), igual que en la tabla base.

create or replace view public.v_consumos_diarios
with (security_invoker = true) as
select
  cups_id,
  fecha,
  sum(consumo_kwh)::numeric(12,3)    as consumo_kwh,
  sum(excedente_kwh)::numeric(12,3)  as excedente_kwh,
  count(*)                           as horas,
  count(*) filter (where metodo_obtencion = 'estimada') as horas_estimadas
from public.datadis_consumptions
group by cups_id, fecha;

comment on view public.v_consumos_diarios is
  'PR-4.1: agregado diario de datadis_consumptions para la curva de la pestaña Suministros. security_invoker: hereda la RLS de la tabla base.';

grant select on public.v_consumos_diarios to authenticated;
revoke all on public.v_consumos_diarios from anon;

-- Fleco cazado al aplicar (23-jul, sesión 13): los default privileges dejaban
-- a authenticated con escrituras sobre la vista (la RLS de la base las bloquea,
-- pero el patrón Fase 0.3b manda: la vista es SELECT-only explícito).
revoke insert, update, delete, truncate, references, trigger
  on public.v_consumos_diarios from authenticated;
