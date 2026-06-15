-- 20260614_facturas_coordinacion.sql
-- Coordinacion de la tabla facturas entre fuentes (manual / Datadis / IA / telemedida).
-- APLICADA EN PROD 2026-06-14 (facturas vacia, sin riesgo).
--
-- MODELO POR PERIODO: una factura va por periodo real (fecha_inicio -> fecha_fin),
-- NO por mes natural. Puede haber 2 facturas en un mes (1-20 y 21-fin) o una factura
-- que cruza meses (1-ene a 12-feb). El periodo es la identidad y permite CASAR el
-- consumo con Datadis / distribuidora / telemedida (que dan datos por fecha).

-- origen: de donde viene cada factura (evita que una fuente pise a otra)
alter table public.facturas
  add column if not exists origen text not null default 'manual';
comment on column public.facturas.origen is
  'Fuente: manual | datadis | ia | telemedida. Default manual.';

-- documento_url: PDF/Excel adjunto en bucket documentos (Fase B)
alter table public.facturas
  add column if not exists documento_url text;
comment on column public.facturas.documento_url is
  'Ruta en Storage (bucket documentos) del documento de factura. Null si no hay.';

-- periodo real de facturacion
alter table public.facturas
  add column if not exists fecha_inicio date,
  add column if not exists fecha_fin date;
comment on column public.facturas.fecha_inicio is
  'Inicio del periodo facturado (puede no coincidir con inicio de mes).';
comment on column public.facturas.fecha_fin is
  'Fin del periodo facturado (puede cruzar meses). Identidad junto a cups_id.';

-- quitar la constraint por-mes incorrecta si existiera
alter table public.facturas
  drop constraint if exists facturas_cups_month_year_uniq;

-- identidad correcta: una factura unica por CUPS + periodo exacto
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.facturas'::regclass
      and conname = 'facturas_cups_periodo_uniq'
  ) then
    alter table public.facturas
      add constraint facturas_cups_periodo_uniq
      unique (cups_id, fecha_inicio, fecha_fin);
  end if;
end $$;

-- indice por rango de fechas para casar con datos diarios (Datadis/telemedida)
create index if not exists idx_facturas_cups_periodo
  on public.facturas (cups_id, fecha_inicio, fecha_fin);
