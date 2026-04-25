-- ═══════════════════════════════════════════════════════════════════
-- Fase 2.A — Crear schema _potencia_staging en el CRM
-- ═══════════════════════════════════════════════════════════════════
-- Crea las tablas de Potencias tal cual en un schema separado del CRM.
-- Después se carga el dump --data-only y se hace el transform.
-- Idempotente: drop+create, no destruye datos en `public`.
-- ═══════════════════════════════════════════════════════════════════

drop schema if exists _potencia_staging cascade;
create schema _potencia_staging;

-- ───────── tablas core ─────────
create table _potencia_staging.profiles (
  id uuid primary key,
  email text not null,
  nombre text not null,
  apellidos text not null default '',
  rol text not null default 'comercial',
  activo boolean not null default false,
  created_at timestamptz not null default now()
);

create table _potencia_staging.clients (
  id uuid primary key,
  nombre_fiscal text not null,
  cif text,
  persona_contacto text,
  email_contacto text,
  telefono text,
  direccion_fiscal text,
  ciudad text,
  codigo_postal text,
  asesor_id uuid,
  notas text,
  activo boolean default true,
  created_by uuid,
  created_at timestamptz default now(),
  gestor_id uuid
);

create table _potencia_staging.supplies (
  id uuid primary key,
  client_id uuid not null,
  cups text not null,
  denominacion text,
  direccion_suministro text,
  ciudad_suministro text,
  tariff_type text,
  channel text,
  distribuidora text,
  comercializadora text,
  p1_kw numeric default 0,
  p2_kw numeric default 0,
  p3_kw numeric default 0,
  p4_kw numeric default 0,
  p5_kw numeric default 0,
  p6_kw numeric default 0,
  potencia_maxima_disponible numeric,
  tension_kv numeric,
  notas text,
  activo boolean default true,
  created_by uuid,
  created_at timestamptz default now(),
  comercializadora_id uuid
);

create table _potencia_staging.comercializadoras (
  id uuid primary key,
  nombre text not null,
  notas text,
  activa boolean default true,
  created_by uuid,
  created_at timestamptz default now()
);

create table _potencia_staging.regulated_rates (
  id uuid primary key,
  tariff_type text not null,
  period text not null,
  rate_eur_kw_day numeric not null,
  valid_from date,
  valid_to date,
  updated_by uuid,
  updated_at timestamptz default now()
);

create table _potencia_staging.email_templates (
  id uuid primary key,
  tipo text not null,
  nombre text not null,
  asunto text not null,
  cuerpo_html text not null,
  variables_disponibles jsonb,
  activo boolean default true,
  updated_by uuid,
  updated_at timestamptz default now()
);

create table _potencia_staging.expedientes (
  id uuid primary key,
  supply_id uuid not null,
  client_id uuid not null,
  anio integer not null,
  tipo_normativa text not null,
  max_ciclos_permitidos integer,
  ciclos_realizados integer not null default 0,
  estado text not null,
  notas text,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table _potencia_staging.ciclos (
  id uuid primary key,
  expediente_id uuid not null,
  numero_ciclo integer not null,
  estado text not null,
  ahorro_previsto_total numeric,
  ahorro_real_total numeric,
  created_at timestamptz default now()
);

create table _potencia_staging.power_requests (
  id uuid primary key,
  ciclo_id uuid not null,
  supply_id uuid not null,
  client_id uuid not null,
  tipo text not null,
  estado text not null,
  channel_used text,
  comercializadora_nombre text,
  p1_actual numeric, p1_nueva numeric,
  p2_actual numeric, p2_nueva numeric,
  p3_actual numeric, p3_nueva numeric,
  p4_actual numeric, p4_nueva numeric,
  p5_actual numeric, p5_nueva numeric,
  p6_referencia numeric,
  fecha_prevista_inicio date,
  fecha_prevista_fin date,
  fecha_solicitud_enviada date,
  fecha_autorizacion date,
  fecha_ejecucion_real date,
  fecha_alerta_amarilla date,
  fecha_alerta_naranja date,
  fecha_alerta_roja date,
  ref_solicitud_distribuidora text,
  ref_autorizacion text,
  notas_internas text,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  doc_autorizacion_id uuid,
  doc_autorizacion_firmada_id uuid,
  fecha_envio_autorizacion date,
  fecha_firma_cliente date
);

create table _potencia_staging.savings_calculations (
  id uuid primary key,
  ciclo_id uuid not null,
  request_id uuid not null,
  ahorro_previsto_p1 numeric, ahorro_previsto_p2 numeric, ahorro_previsto_p3 numeric,
  ahorro_previsto_p4 numeric, ahorro_previsto_p5 numeric,
  ahorro_previsto_total numeric,
  dias_previstos integer,
  ahorro_real_p1 numeric, ahorro_real_p2 numeric, ahorro_real_p3 numeric,
  ahorro_real_p4 numeric, ahorro_real_p5 numeric,
  ahorro_real_total numeric,
  dias_reales integer,
  fecha_calculo timestamptz default now()
);

create table _potencia_staging.client_communications (
  id uuid primary key,
  client_id uuid not null,
  expediente_id uuid,
  ciclo_id uuid,
  tipo text not null,
  asunto text not null,
  cuerpo_html text not null,
  destinatario_email text not null,
  cc_email text,
  fecha_envio timestamptz,
  enviado_por uuid,
  resend_message_id text,
  estado text not null,
  error_detalle text,
  created_at timestamptz default now()
);

create table _potencia_staging.client_documents (
  id uuid primary key,
  client_id uuid not null,
  tipo text,
  nombre text,
  descripcion text,
  nombre_archivo text,
  storage_path text,
  tamano_bytes bigint,
  expediente_id uuid,
  ciclo_id uuid,
  metadata jsonb,
  subido_por uuid,
  created_at timestamptz default now()
);

create table _potencia_staging.expediente_documents (
  id uuid primary key,
  expediente_id uuid,
  ciclo_id uuid,
  tipo text,
  nombre_archivo text,
  nombre_original text,
  mime_type text,
  tamano_bytes bigint,
  storage_path text,
  notas text,
  subido_por uuid,
  created_at timestamptz default now()
);

create table _potencia_staging.comercializadora_docs (
  id uuid primary key,
  comercializadora_id uuid not null,
  nombre text not null,
  descripcion text,
  nombre_archivo text not null,
  storage_path text not null,
  tamano_bytes integer,
  subido_por uuid,
  created_at timestamptz default now(),
  es_plantilla_autorizacion boolean default false,
  campos_mapeados jsonb default '{}',
  campos_detectados jsonb default '{}',
  instrucciones text
);

create table _potencia_staging.documentacion (
  id uuid primary key,
  nombre text,
  descripcion text,
  categoria text,
  nombre_archivo text,
  storage_path text,
  tamano_bytes bigint,
  subido_por uuid,
  created_at timestamptz default now()
);

create table _potencia_staging.status_log (
  id uuid primary key,
  expediente_id uuid,
  ciclo_id uuid,
  request_id uuid,
  estado_anterior text,
  estado_nuevo text not null,
  cambiado_por uuid,
  notas text,
  fecha_cambio timestamptz default now()
);

create table _potencia_staging.alerts (
  id uuid primary key,
  expediente_id uuid,
  ciclo_id uuid,
  request_id uuid,
  supply_id uuid,
  client_id uuid,
  tipo text not null,
  fecha_alerta date,
  mensaje text,
  leida boolean default false,
  fecha_lectura timestamptz,
  leida_por uuid,
  created_at timestamptz default now()
);

create table _potencia_staging.excel_import_templates (
  id uuid primary key,
  comercializadora_id uuid,
  nombre text,
  descripcion text,
  campos_mapeados jsonb,
  header_row integer,
  sheet_name text,
  creado_por uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Sin RLS en staging — solo operación interna de migración.
