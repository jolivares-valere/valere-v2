-- ═══════════════════════════════════════════════════════════════════
-- Migration: Unificación Potencias → CRM (aditiva, NO destructiva)
-- Fecha: 2026-04-25 (sprint unificación)
-- Autor: Cowork
-- ═══════════════════════════════════════════════════════════════════
--
-- Esta migration prepara el CRM canónico para absorber las tablas y
-- datos del proyecto valere-gestion-potencias (alesfvxqtwlrwlmkoosg).
--
-- ESTRATEGIA ADITIVA:
-- - NO renombra tablas existentes del CRM (mantiene empresas, cups,
--   retailers, user_profiles — el código ya los usa).
-- - Añade columnas opcionales a tablas existentes (legacy_potencia_id,
--   campos de Potencias útiles).
-- - Crea las tablas nuevas de Potencias con nombres canónicos castellano
--   (solicitudes_potencia, comunicaciones_cliente, alertas, etc.).
-- - La tabla documentos (polimórfica, ya existe) absorbe las 3 tablas
--   de documentos de Potencias.
-- - retailers absorbe las comercializadoras de Potencias.
--
-- Idempotente: se puede ejecutar múltiples veces sin efectos secundarios.
-- No toca datos existentes — solo DDL.
-- ═══════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════
-- 1. EXTENDER TABLAS EXISTENTES — solo añadir columnas opcionales
-- ═══════════════════════════════════════════════════════════════════

-- user_profiles: añadir nombre + apellidos + legacy_potencia_id
alter table public.user_profiles add column if not exists nombre text;
alter table public.user_profiles add column if not exists apellidos text;
alter table public.user_profiles add column if not exists legacy_potencia_id uuid;

comment on column public.user_profiles.legacy_potencia_id is
  'ID original del user en valere-gestion-potencias.profiles. Solo útil durante migración.';

-- empresas: columnas adicionales de Potencias
alter table public.empresas add column if not exists legacy_potencia_id uuid;
alter table public.empresas add column if not exists persona_contacto text;
alter table public.empresas add column if not exists activo boolean not null default true;
alter table public.empresas add column if not exists asesor_id uuid references public.user_profiles(id);

comment on column public.empresas.legacy_potencia_id is
  'ID original del client en valere-gestion-potencias. Solo útil durante migración.';
comment on column public.empresas.asesor_id is
  'Asesor técnico (distinto del comercial_id). Usado en Potencias para asignar expedientes.';

-- cups: columnas adicionales de Potencias (potencias P1-P6 como columnas, además del JSONB)
alter table public.cups add column if not exists legacy_potencia_id uuid;
alter table public.cups add column if not exists denominacion text;
alter table public.cups add column if not exists tension_kv numeric;
alter table public.cups add column if not exists potencia_maxima_disponible numeric;
alter table public.cups add column if not exists channel text default 'electricidad';
alter table public.cups add column if not exists p1_kw numeric;
alter table public.cups add column if not exists p2_kw numeric;
alter table public.cups add column if not exists p3_kw numeric;
alter table public.cups add column if not exists p4_kw numeric;
alter table public.cups add column if not exists p5_kw numeric;
alter table public.cups add column if not exists p6_kw numeric;
alter table public.cups add column if not exists ciudad_suministro text;

comment on column public.cups.legacy_potencia_id is
  'ID original del supply en valere-gestion-potencias. Solo útil durante migración.';

-- retailers: absorber campos de comercializadoras Potencias
alter table public.retailers add column if not exists legacy_potencia_com_id uuid;
alter table public.retailers add column if not exists nif text;
alter table public.retailers add column if not exists tipo_energia text
  check (tipo_energia in ('electrica', 'gas', 'dual'));
alter table public.retailers add column if not exists activa boolean default true;
alter table public.retailers add column if not exists nombre_normalizado text;

-- Función para normalizar nombre (para dedupe)
create or replace function public.normalizar_nombre_retailer(input text)
returns text language sql immutable
as $$
  select upper(regexp_replace(coalesce(input, ''), '[\s\-\.\,]', '', 'g'));
$$;

-- Populate nombre_normalizado para las filas existentes (para poder hacer dedup)
update public.retailers
set nombre_normalizado = public.normalizar_nombre_retailer(name)
where nombre_normalizado is null;

-- documentos: añadir campos de Potencias (FK a cups, expedientes, ciclos)
-- expedientes y ciclos no existen aún — se crean más abajo, pero usamos FK diferidas
alter table public.documentos add column if not exists cups_id uuid references public.cups(id) on delete set null;
alter table public.documentos add column if not exists expediente_id uuid;
alter table public.documentos add column if not exists ciclo_id uuid;
alter table public.documentos add column if not exists empresa_id uuid references public.empresas(id) on delete set null;
alter table public.documentos add column if not exists nombre_archivo text;
alter table public.documentos add column if not exists nombre_original text;
alter table public.documentos add column if not exists metadata jsonb;
alter table public.documentos add column if not exists notas text;
alter table public.documentos add column if not exists legacy_source text;  -- 'client_documents', 'expediente_documents', 'documentacion'
alter table public.documentos add column if not exists legacy_potencia_id uuid;

-- ═══════════════════════════════════════════════════════════════════
-- 2. NUEVAS TABLAS — gestión potencias
-- ═══════════════════════════════════════════════════════════════════

-- Expedientes: cada cliente+año+normativa
create table if not exists public.expedientes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  cups_id uuid not null references public.cups(id) on delete cascade,
  anio integer not null,
  estado text not null,
  tipo_normativa text not null,
  ciclos_realizados integer not null default 0,
  max_ciclos_permitidos integer,
  notas text,
  legacy_potencia_id uuid,
  created_by uuid references public.user_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expedientes_empresa_idx on public.expedientes (empresa_id);
create index if not exists expedientes_cups_idx on public.expedientes (cups_id);
create index if not exists expedientes_anio_idx on public.expedientes (anio);

-- Ciclos: dentro de cada expediente pueden ejecutarse varios ciclos/cambios
create table if not exists public.ciclos (
  id uuid primary key default gen_random_uuid(),
  expediente_id uuid not null references public.expedientes(id) on delete cascade,
  numero_ciclo integer not null,
  estado text not null,
  ahorro_previsto_total numeric,
  ahorro_real_total numeric,
  legacy_potencia_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists ciclos_expediente_idx on public.ciclos (expediente_id);

-- Solicitudes de potencia (renombrada desde power_requests de Potencias)
create table if not exists public.solicitudes_potencia (
  id uuid primary key default gen_random_uuid(),
  ciclo_id uuid not null references public.ciclos(id) on delete cascade,
  expediente_id uuid references public.expedientes(id) on delete set null,
  cups_id uuid not null references public.cups(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  tipo text not null,
  estado text not null,
  comercializadora_nombre text,
  channel_used text,
  -- Potencias actuales y nuevas
  p1_actual numeric, p1_nueva numeric,
  p2_actual numeric, p2_nueva numeric,
  p3_actual numeric, p3_nueva numeric,
  p4_actual numeric, p4_nueva numeric,
  p5_actual numeric, p5_nueva numeric,
  p6_referencia numeric,
  -- Fechas del flujo
  fecha_solicitud_enviada date,
  fecha_envio_autorizacion date,
  fecha_firma_cliente date,
  fecha_autorizacion date,
  fecha_ejecucion_real date,
  fecha_prevista_inicio date,
  fecha_prevista_fin date,
  fecha_alerta_amarilla date,
  fecha_alerta_naranja date,
  fecha_alerta_roja date,
  ref_solicitud_distribuidora text,
  ref_autorizacion text,
  doc_autorizacion_id uuid,
  doc_autorizacion_firmada_id uuid,
  notas_internas text,
  legacy_potencia_id uuid,
  created_by uuid references public.user_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists solicitudes_potencia_ciclo_idx on public.solicitudes_potencia (ciclo_id);
create index if not exists solicitudes_potencia_empresa_idx on public.solicitudes_potencia (empresa_id);

-- Cálculos de ahorro (para excedentes + potencias)
create table if not exists public.savings_calculations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.solicitudes_potencia(id) on delete cascade,
  ciclo_id uuid not null references public.ciclos(id) on delete cascade,
  dias_previstos integer,
  dias_reales integer,
  ahorro_previsto_p1 numeric, ahorro_real_p1 numeric,
  ahorro_previsto_p2 numeric, ahorro_real_p2 numeric,
  ahorro_previsto_p3 numeric, ahorro_real_p3 numeric,
  ahorro_previsto_p4 numeric, ahorro_real_p4 numeric,
  ahorro_previsto_p5 numeric, ahorro_real_p5 numeric,
  ahorro_previsto_total numeric,
  ahorro_real_total numeric,
  legacy_potencia_id uuid,
  fecha_calculo timestamptz not null default now()
);

create index if not exists savings_calculations_request_idx on public.savings_calculations (request_id);

-- FK diferida de documentos a expedientes y ciclos (ahora que existen)
alter table public.documentos
  drop constraint if exists documentos_expediente_fk;
alter table public.documentos
  add constraint documentos_expediente_fk
  foreign key (expediente_id) references public.expedientes(id) on delete set null;

alter table public.documentos
  drop constraint if exists documentos_ciclo_fk;
alter table public.documentos
  add constraint documentos_ciclo_fk
  foreign key (ciclo_id) references public.ciclos(id) on delete set null;

-- ═══════════════════════════════════════════════════════════════════
-- 3. NUEVAS TABLAS — comunicaciones + alertas + docs comercializadora
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.comercializadora_docs (
  id uuid primary key default gen_random_uuid(),
  comercializadora_id uuid not null references public.retailers(id) on delete cascade,
  nombre text not null,
  descripcion text,
  nombre_archivo text not null,
  storage_path text not null,
  tamano_bytes integer,
  campos_detectados jsonb not null default '{}',
  campos_mapeados jsonb not null default '{}',
  instrucciones text,
  es_plantilla_autorizacion boolean not null default false,
  legacy_potencia_id uuid,
  subido_por uuid references public.user_profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists comercializadora_docs_com_idx on public.comercializadora_docs (comercializadora_id);

create table if not exists public.comunicaciones_cliente (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  ciclo_id uuid references public.ciclos(id) on delete set null,
  expediente_id uuid references public.expedientes(id) on delete set null,
  tipo text not null,
  asunto text not null,
  cuerpo_html text not null,
  destinatario_email text not null,
  cc_email text,
  estado text not null,
  fecha_envio timestamptz,
  resend_message_id text,
  error_detalle text,
  legacy_potencia_id uuid,
  enviado_por uuid references public.user_profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists comunicaciones_cliente_empresa_idx on public.comunicaciones_cliente (empresa_id);

create table if not exists public.alertas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete cascade,
  cups_id uuid references public.cups(id) on delete set null,
  expediente_id uuid references public.expedientes(id) on delete set null,
  ciclo_id uuid references public.ciclos(id) on delete set null,
  request_id uuid references public.solicitudes_potencia(id) on delete set null,
  tipo text not null,
  mensaje text not null,
  fecha_alerta date not null,
  leida boolean not null default false,
  leida_por uuid references public.user_profiles(id),
  fecha_lectura timestamptz,
  legacy_potencia_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists alertas_empresa_idx on public.alertas (empresa_id);
create index if not exists alertas_no_leidas_idx on public.alertas (leida, fecha_alerta) where leida = false;

-- ═══════════════════════════════════════════════════════════════════
-- 4. NUEVAS TABLAS — plantillas + status log
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo text not null,
  asunto text not null,
  cuerpo_html text not null,
  variables_disponibles jsonb,
  activo boolean not null default true,
  legacy_potencia_id uuid,
  updated_by uuid references public.user_profiles(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.excel_import_templates (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  comercializadora_id uuid references public.retailers(id),
  header_row integer not null default 1,
  sheet_name text,
  campos_mapeados jsonb not null default '{}',
  legacy_potencia_id uuid,
  creado_por uuid references public.user_profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.status_log (
  id uuid primary key default gen_random_uuid(),
  entidad_tipo text,
  entidad_id uuid,
  expediente_id uuid references public.expedientes(id) on delete set null,
  ciclo_id uuid references public.ciclos(id) on delete set null,
  request_id uuid references public.solicitudes_potencia(id) on delete set null,
  estado_anterior text,
  estado_nuevo text not null,
  fecha_cambio timestamptz not null default now(),
  cambiado_por uuid references public.user_profiles(id),
  notas text,
  legacy_potencia_id uuid
);

create index if not exists status_log_expediente_idx on public.status_log (expediente_id);
create index if not exists status_log_ciclo_idx on public.status_log (ciclo_id);

-- ═══════════════════════════════════════════════════════════════════
-- 5. RLS — habilitar y aplicar policies básicas
-- ═══════════════════════════════════════════════════════════════════

alter table public.expedientes enable row level security;
alter table public.ciclos enable row level security;
alter table public.solicitudes_potencia enable row level security;
alter table public.savings_calculations enable row level security;
alter table public.comercializadora_docs enable row level security;
alter table public.comunicaciones_cliente enable row level security;
alter table public.alertas enable row level security;
alter table public.email_templates enable row level security;
alter table public.excel_import_templates enable row level security;
alter table public.status_log enable row level security;

-- Policy patrón: authenticated puede leer todo, authenticated puede escribir todo.
-- Granularidad por rol se añade en migration posterior (fase28.6 style).

-- Expedientes
drop policy if exists "expedientes_authenticated_all" on public.expedientes;
create policy "expedientes_authenticated_all" on public.expedientes
  for all to authenticated using (true) with check (true);

drop policy if exists "ciclos_authenticated_all" on public.ciclos;
create policy "ciclos_authenticated_all" on public.ciclos
  for all to authenticated using (true) with check (true);

drop policy if exists "solicitudes_potencia_authenticated_all" on public.solicitudes_potencia;
create policy "solicitudes_potencia_authenticated_all" on public.solicitudes_potencia
  for all to authenticated using (true) with check (true);

drop policy if exists "savings_calculations_authenticated_all" on public.savings_calculations;
create policy "savings_calculations_authenticated_all" on public.savings_calculations
  for all to authenticated using (true) with check (true);

drop policy if exists "comercializadora_docs_authenticated_all" on public.comercializadora_docs;
create policy "comercializadora_docs_authenticated_all" on public.comercializadora_docs
  for all to authenticated using (true) with check (true);

drop policy if exists "comunicaciones_cliente_authenticated_all" on public.comunicaciones_cliente;
create policy "comunicaciones_cliente_authenticated_all" on public.comunicaciones_cliente
  for all to authenticated using (true) with check (true);

drop policy if exists "alertas_authenticated_all" on public.alertas;
create policy "alertas_authenticated_all" on public.alertas
  for all to authenticated using (true) with check (true);

drop policy if exists "email_templates_authenticated_read" on public.email_templates;
create policy "email_templates_authenticated_read" on public.email_templates
  for select to authenticated using (true);

drop policy if exists "email_templates_admin_write" on public.email_templates;
create policy "email_templates_admin_write" on public.email_templates
  for all to authenticated
  using (exists (select 1 from public.user_profiles where id = auth.uid() and role in ('master','manager')))
  with check (exists (select 1 from public.user_profiles where id = auth.uid() and role in ('master','manager')));

drop policy if exists "excel_import_templates_authenticated_all" on public.excel_import_templates;
create policy "excel_import_templates_authenticated_all" on public.excel_import_templates
  for all to authenticated using (true) with check (true);

drop policy if exists "status_log_authenticated_read" on public.status_log;
create policy "status_log_authenticated_read" on public.status_log
  for select to authenticated using (true);

drop policy if exists "status_log_service_write" on public.status_log;
create policy "status_log_service_write" on public.status_log
  for insert to service_role with check (true);

-- ═══════════════════════════════════════════════════════════════════
-- 6. Comentarios finales
-- ═══════════════════════════════════════════════════════════════════

comment on table public.expedientes is 'Expedientes de gestión de potencias. 1 por cliente+CUPS+año+normativa. Migrado desde valere-gestion-potencias 2026-04-25.';
comment on table public.ciclos is 'Ciclos dentro de un expediente. Un expediente puede tener 1-N ciclos de cambio de potencia.';
comment on table public.solicitudes_potencia is 'Solicitudes concretas de cambio de potencia. Renombrada desde power_requests al unificar.';
comment on table public.savings_calculations is 'Cálculos de ahorro previsto y real por ciclo.';
comment on table public.comunicaciones_cliente is 'Log de emails enviados al cliente vía Resend. Renombrada desde client_communications.';
comment on table public.alertas is 'Alertas del sistema (fechas próximas, incidencias automáticas). Renombrada desde alerts al unificar.';
