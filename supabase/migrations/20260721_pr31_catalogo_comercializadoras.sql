-- PR-3.1 (semana 3 CRM UTIL): catalogo de comercializadoras + condiciones de comision
-- APLICADA EN PRODUCCION 21-jul-2026 via MCP (con OK de Juan).
-- Insumo: "REGLAS DE COMISIONES Y CANALES - VALERE v2 (vigente)" (Drive, dictado Juan jul-2026)
-- DECISION (21-jul, OK Juan): EXTENDER la tabla existente public.comercializadoras
-- (maestro real de la calculadora; `retailers` es una VISTA sobre ella) en vez de crear otra.
-- name / vista retailers NO se tocan (calculadora intacta).

-- 1) Columnas nuevas en el maestro
alter table public.comercializadoras
  add column if not exists nombre_canonico text,
  add column if not exists grupo text,
  add column if not exists segmento text,
  add column if not exists via text check (via in ('directa','zoco','xentia')),
  add column if not exists es_canal_venta boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();
create unique index if not exists uq_comercializadoras_nombre_canonico
  on public.comercializadoras (nombre_canonico) where nombre_canonico is not null;
comment on column public.comercializadoras.nombre_canonico is 'Grafia UNICA del canal de venta (= contratos.compania canonico). Null en comercializadoras solo-calculadora.';
comment on column public.comercializadoras.via is 'Via de acceso POR DEFECTO: directa | zoco (retiene 10%, a Valere el 90%) | xentia (EDP Empresas, llega neto). Una condicion puede sobreescribirla.';
comment on column public.comercializadoras.es_canal_venta is 'true = aparece en el selector de contratos del CRM (catalogo PR-3.1).';

drop trigger if exists trg_comercializadoras_updated on public.comercializadoras;
create trigger trg_comercializadoras_updated before update on public.comercializadoras
  for each row execute function public.set_updated_at();

-- 2) Tabla hija: condiciones de comision por comercializadora x producto
create table if not exists public.comercializadora_condiciones (
  id uuid primary key default gen_random_uuid(),
  comercializadora_id uuid not null references public.comercializadoras(id) on delete cascade,
  producto text,
  tipo_regla text not null check (tipo_regla in ('pct_fee','pct_margen','fijo_tarifa','eur_kw','tramos')),
  componente text check (componente in ('energia','potencia','periodo','servicio')),
  valor numeric,
  via text check (via in ('directa','zoco','xentia')),
  cadencia text not null default 'one_shot' check (cadencia in ('one_shot','mensual','trimestral')),
  comisiona_renovacion boolean not null default true,
  vigencia_desde date,
  vigencia_hasta date,
  activa boolean not null default true,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.comercializadora_condiciones is 'Condiciones de comision por comercializadora x producto (doc REGLAS v2). valor SIEMPRE editable (pacto comercial). vigencia_hasta = adendas que caducan (Audax/ADX/NEXUS 31/12/2026). via null = hereda la del maestro.';
create index if not exists idx_cond_comercializadora on public.comercializadora_condiciones(comercializadora_id);
drop trigger if exists trg_cond_updated on public.comercializadora_condiciones;
create trigger trg_cond_updated before update on public.comercializadora_condiciones
  for each row execute function public.set_updated_at();

-- RLS condiciones: mismo patron que el maestro (leer todos, escribir admin/master)
alter table public.comercializadora_condiciones enable row level security;
create policy cond_select on public.comercializadora_condiciones for select to authenticated using (true);
create policy cond_insert on public.comercializadora_condiciones for insert to authenticated
  with check (get_user_rol() in ('admin','master'));
create policy cond_update on public.comercializadora_condiciones for update to authenticated
  using (get_user_rol() in ('admin','master')) with check (get_user_rol() in ('admin','master'));
create policy cond_delete on public.comercializadora_condiciones for delete to authenticated
  using (get_user_rol() in ('admin','master'));

-- 3) FK en contratos (backfill = operacion de datos aparte, con OK)
alter table public.contratos add column if not exists comercializadora_id uuid references public.comercializadoras(id);
create index if not exists idx_contratos_comercializadora on public.contratos(comercializadora_id);

-- 4) Mapear las 10 filas existentes que SON canal de venta
update public.comercializadoras set nombre_canonico='ADX', via='directa', es_canal_venta=true where name='ADX Corporate';
update public.comercializadoras set nombre_canonico='ENDESA', grupo='ENDESA', segmento='pyme', via='directa', es_canal_venta=true, notes=coalesce(notes,'')||' Solo pyme (doc REGLAS v2)' where name='Endesa';
update public.comercializadoras set nombre_canonico='VM', via='directa', es_canal_venta=true where name='Enérgya-VM';
update public.comercializadoras set nombre_canonico='NAGINI', via='zoco', es_canal_venta=true, notes=coalesce(notes,'')||' Grafia unica NAGINI (7 clientes via Zoco, jul-2026)' where name='Nagini Energía';
update public.comercializadoras set nombre_canonico='NATURGY', via='zoco', es_canal_venta=true where name='Naturgy';
update public.comercializadoras set nombre_canonico='NEXUS', via='directa', es_canal_venta=true where name='Nexus Energía';
update public.comercializadoras set nombre_canonico='PLENITUDE', via='zoco', es_canal_venta=true where name='Plenitude';
update public.comercializadoras set nombre_canonico='SILVER', via='directa', es_canal_venta=true, notes=coalesce(notes,'')||' =SILVER ENERGIA (unificacion de datos aparte)' where name='Silver Energía';
update public.comercializadoras set nombre_canonico='TOTAL', via='directa', es_canal_venta=true where name='Total Energies';
update public.comercializadoras set nombre_canonico='UNIELECTRICA', via='zoco', es_canal_venta=true where name='UniEléctrica';

-- 5) Insertar las 10 que faltan (canal de venta; la calculadora las ignora sin ofertas)
insert into public.comercializadoras (name, nombre_canonico, grupo, segmento, via, es_canal_venta, is_active, activa, notes)
select x.name, x.canonico, x.grupo, x.segmento, x.via, true, true, true, x.notas
from (values
  ('Audax', 'AUDAX', null, null, 'directa', null),
  ('Bassols', 'BASSOLS', null, null, 'directa', null),
  ('CYE', 'CYE', null, null, 'directa', null),
  ('Esmiluz', 'ESMILUZ', null, null, 'directa', null),
  ('ODF', 'ODF', null, null, 'directa', null),
  ('Visalia', 'VISALIA', null, null, 'directa', null),
  ('EDP Grandes Cuentas', 'EDP GRANDES CUENTAS', 'EDP', 'grandes_cuentas', 'directa', null),
  ('EDP Empresas', 'EDP EMPRESAS', 'EDP', 'empresas', 'xentia', 'Via Xentia (colaborador EDP): llega NETO'),
  ('GANA', 'GANA', null, null, 'zoco', '=GANA ENERGIA (unificacion de datos aparte)'),
  ('Eleia', 'ELEIA', null, null, 'zoco', 'Via Zoco confirmada 21-jul-2026; condiciones pendientes de dictar')
) as x(name, canonico, grupo, segmento, via, notas)
where not exists (select 1 from public.comercializadoras c where c.nombre_canonico = x.canonico);

-- 6) SEED condiciones dictadas (doc v2 + confirmaciones 21-jul-2026)
with c as (select id, nombre_canonico from public.comercializadoras where nombre_canonico is not null)
insert into public.comercializadora_condiciones
  (comercializadora_id, producto, tipo_regla, componente, valor, cadencia, comisiona_renovacion, vigencia_hasta, notas)
select c.id, x.producto, x.tipo_regla, x.componente, x.valor, x.cadencia, x.renov, x.hasta, x.notas
from c join (values
  ('AUDAX', null, 'pct_fee', null, 50::numeric, 'one_shot', true, null::date, null),
  ('AUDAX', 'fijo corporate', 'pct_fee', null, 60, 'one_shot', true, date '2026-12-31', 'ADENDA +10% sobre precio fijo corporate hasta 31/12/2026'),
  ('ADX', null, 'pct_fee', null, 50, 'one_shot', true, null, 'Como Audax'),
  ('ADX', 'fijo corporate', 'pct_fee', null, 60, 'one_shot', true, date '2026-12-31', 'ADENDA +10% hasta 31/12/2026 (como Audax)'),
  ('ADX', 'CORPORATE HYBRID', 'pct_fee', null, 100, 'one_shot', true, null, '100% del fee'),
  ('TOTAL', 'indexado', 'pct_fee', null, 60, 'one_shot', true, null, null),
  ('TOTAL', 'fijo', 'pct_fee', null, 50, 'one_shot', true, null, null),
  ('NEXUS', null, 'pct_fee', null, 50, 'one_shot', true, null, null),
  ('NEXUS', null, 'pct_fee', null, 60, 'one_shot', true, date '2026-12-31', 'ADENDA +10% hasta 31/12/2026'),
  ('BASSOLS', null, 'pct_margen', null, 50, 'one_shot', true, null, 'A veces + % del margen puesto en POTENCIA (pactado caso a caso)'),
  ('VM', 'fijo', 'pct_fee', null, 60, 'one_shot', true, null, 'VARIA por pacto - editable'),
  ('VM', 'indexado', 'pct_fee', null, 65, 'one_shot', true, null, 'VARIA por pacto - editable'),
  ('SILVER', null, 'pct_fee', 'energia', 50, 'one_shot', true, null, null),
  ('SILVER', null, 'pct_fee', 'potencia', 30, 'one_shot', true, null, null),
  ('ESMILUZ', null, 'pct_fee', 'energia', 50, 'one_shot', true, null, null),
  ('ESMILUZ', 'bateria virtual', 'eur_kw', 'servicio', 1, 'one_shot', true, null, '1 EUR/kW de bateria virtual'),
  ('ENDESA', null, 'fijo_tarifa', null, null, 'one_shot', false, null, 'Comision FIJA asignada por tarifa (no %). NO comisiona renovacion (tras 12 meses)'),
  ('ODF', null, 'pct_fee', null, 50, 'one_shot', true, null, null),
  ('ODF', 'indexado', 'pct_fee', null, 50, 'mensual', true, null, 'Si el cliente firma indexado, paga el 50% MES A MES'),
  ('VISALIA', null, 'pct_fee', null, 50, 'mensual', true, null, 'Pago MENSUAL (no one-shot)'),
  ('EDP GRANDES CUENTAS', 'indexado', 'pct_fee', null, null, 'trimestral', true, null, 'Indexado sin permanencia - pago TRIMESTRAL; % por pacto'),
  ('EDP EMPRESAS', null, 'pct_fee', null, 50, 'one_shot', true, null, '50% fee NETO de Xentia'),
  ('NATURGY', null, 'tramos', null, null, 'one_shot', false, null, 'Paga por PRODUCTO y TRAMO DE VOLUMEN. NO comisiona renovacion (tras 12 meses)'),
  ('UNIELECTRICA', null, 'pct_fee', null, 50, 'one_shot', true, null, 'Tipica Zoco (50% fee) - confirmar por producto'),
  ('GANA', null, 'pct_fee', null, 50, 'one_shot', true, null, 'Tipica Zoco (50% fee) - confirmar por producto'),
  ('NAGINI', null, 'pct_fee', null, 50, 'one_shot', true, null, 'Tipica Zoco (50% fee) - confirmar por producto'),
  ('PLENITUDE', null, 'pct_fee', null, 50, 'one_shot', false, null, 'Tipica Zoco. NO comisiona renovacion'),
  ('CYE', null, 'pct_fee', null, 50, 'one_shot', true, null, 'Confirmado 21-jul-2026')
) as x(canonico, producto, tipo_regla, componente, valor, cadencia, renov, hasta, notas)
  on c.nombre_canonico = x.canonico
where not exists (select 1 from public.comercializadora_condiciones cc where cc.comercializadora_id = c.id);
