# Unificación Supabase — Fase 0 (Diseño Final)

> Generado 2026-04-25 por Cowork. Diseño completo listo para ejecutar sprint de unificación.
> Ahorra 2-3 días del sprint dedicado. Las Fases 1-5 (ejecución) están en `docs/PLAN_UNIFICACION_SUPABASE.md`.
>
> **Estado**: listo para revisión + ajustes finales por Juan, después ejecutar Fase 1.

---

## Decisiones arquitectónicas finales (cerradas)

Tras análisis del schema de los 2 proyectos, estas son las decisiones:

### Naming canónico

Todos los objetos en **castellano coherente** con el resto del código del CRM:

| Concepto | Nombre canónico |
|---|---|
| Empresas/clientes | **`empresas`** |
| Puntos de suministro | **`cups`** |
| Comercializadoras (catálogo maestro) | **`comercializadoras`** |
| Ofertas comercializadoras | **`comercializadora_ofertas`** (renombrar `retailer_offers`) |
| Usuarios | **`user_profiles`** |
| Precios regulados BOE | **`precios_regulados_boe`** |
| Documentos (polimórfico) | **`documentos`** |
| Comunicaciones cliente | **`comunicaciones_cliente`** |

### Single catálogo de comercializadoras

Decidido fusionar `retailers` (CRM, 6 filas) + `comercializadoras` (Potencias, 2 filas) en una sola tabla `comercializadoras` con todos los campos de ambas. Motivos:

- Misma entidad conceptual (comercializadora energética).
- `retailer_offers` pasa a depender de esta tabla unificada.
- Evita tener 2 catálogos sincronizados manualmente.

### Deduplicación

- **Empresas** → clave canónica: `CIF/NIF normalizado` (trim, uppercase, sin espacios/guiones). Si coincide → fusión.
- **CUPS** → clave canónica: `codigo_cups` normalizado (trim, uppercase). Si coincide → fusión.
- **Comercializadoras** → clave canónica: `nombre` normalizado (trim, uppercase, sin .). Ejemplo: "Iberdrola SA" = "IBERDROLA S.A." = "iberdrola".

### Region

Proyecto nuevo en **eu-west-1** (Madrid). Coincide con el CRM actual. Mejor latencia para usuarios España.

### Schema + RLS

- 1 schema `public` con todas las tablas.
- RLS multi-app: columna `app_origen text` en tablas compartidas para filtrar por origen si hace falta (no siempre necesario).
- RLS granular por rol (comercial/manager/master) heredada del CRM actual.

---

## Schema canónico SQL — CREATE TABLES

```sql
-- ═══════════════════════════════════════════════════════════════════
-- Schema Canónico VALERE — unificación de:
--   - PROYECTO VALERE (gtphkowfcuiqbvfkwjxb) — CRM
--   - valere-gestion-potencias (alesfvxqtwlrwlmkoosg) — Potencias + Excedentes
-- Fecha: 2026-04-25 (diseño Fase 0)
-- ═══════════════════════════════════════════════════════════════════

-- Extensiones necesarias
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists "pg_trgm" with schema extensions;
create extension if not exists vector with schema extensions;   -- para asistente RAG
create extension if not exists pgcrypto with schema extensions; -- para gen_random_uuid

-- ───────── CORE ─────────

create table public.user_profiles (
  id uuid primary key,                          -- FK a auth.users
  email text not null unique,
  nombre text not null,                         -- separado en vez de full_name
  apellidos text not null default '',
  rol text not null default 'comercial'         -- 'comercial', 'manager', 'master'
    check (rol in ('comercial', 'manager', 'master')),
  activo boolean not null default false,        -- pendiente aprobación por defecto
  status text default 'pending'                 -- 'pending', 'approved', 'suspended'
    check (status in ('pending', 'approved', 'suspended')),
  avatar_url text,
  legacy_crm_id uuid,                           -- trazabilidad tras migración
  legacy_potencia_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.empresas (
  id uuid primary key default gen_random_uuid(),
  cif_nif text,                                 -- acepta CIF y NIF
  nombre_fiscal text not null,
  persona_contacto text,
  email_contacto text,
  telefono_principal text,
  web text,
  direccion_fiscal text,
  codigo_postal text,
  ciudad text,
  provincia text,
  pais text default 'ES',
  tipo text check (tipo in ('empresa','autonomo','comunidad_propietarios','cooperativa','asociacion')),
  segmento text check (segmento in ('industrial','comercial','servicios','agricola','residencial_colectivo')),
  tags text[] default '{}',
  activo boolean not null default true,
  notas text,
  comercial_id uuid references public.user_profiles(id),
  asesor_id uuid references public.user_profiles(id),
  external_id text,
  legacy_crm_id uuid,
  legacy_potencia_id uuid,
  created_by uuid references public.user_profiles(id),
  updated_by uuid references public.user_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index empresas_cif_nif_idx on public.empresas (cif_nif) where cif_nif is not null;
create index empresas_comercial_idx on public.empresas (comercial_id);
create index empresas_nombre_trgm_idx on public.empresas using gin (nombre_fiscal extensions.gin_trgm_ops);

create table public.comercializadoras (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,                   -- canónico normalizado
  nombre_comercial text,                         -- visible al cliente
  nif text,
  tipo_energia text check (tipo_energia in ('electrica','gas','dual')),
  activa boolean not null default true,
  model text,                                    -- para retailer_offers_meta
  notas text,
  legacy_crm_retailer_id uuid,
  legacy_potencia_com_id uuid,
  created_by uuid references public.user_profiles(id),
  created_at timestamptz not null default now()
);

create table public.cups (
  id uuid primary key default gen_random_uuid(),
  codigo_cups text not null unique,              -- normalizado
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  contrato_id uuid,                              -- FK diferida a contratos
  direccion_suministro text,
  ciudad_suministro text,
  tarifa_acceso text,
  tarifa_manual text,
  distribuidora text,
  comercializadora_actual text,                  -- denormalizado para velocidad
  comercializadora_id uuid references public.comercializadoras(id),
  channel text default 'electricidad',
  denominacion text,
  tension_kv numeric,
  potencia_maxima_disponible numeric,
  -- Potencias contratadas por periodo
  p1_kw numeric default 0,
  p2_kw numeric default 0,
  p3_kw numeric default 0,
  p4_kw numeric default 0,
  p5_kw numeric default 0,
  p6_kw numeric default 0,
  potencias_contratadas jsonb,                   -- alternativa flexible
  -- Consumos históricos (opcional, se puebla con Datadis)
  energia_p1_kwh numeric,
  energia_p2_kwh numeric,
  energia_p3_kwh numeric,
  energia_p4_kwh numeric,
  energia_p5_kwh numeric,
  energia_p6_kwh numeric,
  -- Fotovoltaica
  fecha_instalacion_fv date,
  potencia_fv_kwp numeric,
  potencia_inversor_kw numeric,
  marca_inversor text,
  modelo_autoconsumo text,
  modelo_autoconsumo_manual text,
  coste_instalacion_fv_eur numeric,
  -- Datadis integración
  datadis_sincronizado boolean default false,
  datadis_distribuidor_cod text,
  datadis_punto_tipo integer,
  datadis_ultima_sync timestamptz,
  -- Metadatos
  estado text not null default 'activo'
    check (estado in ('activo','baja','cancelado','tramite')),
  legacy_crm_id uuid,
  legacy_potencia_supply_id uuid,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index cups_empresa_idx on public.cups (empresa_id);
create index cups_codigo_idx on public.cups (codigo_cups);

create table public.precios_regulados_boe (
  id uuid primary key default gen_random_uuid(),
  period text not null,                           -- 'P1', 'P2'... o 'all'
  tariff_type text not null,                      -- '2.0TD', '3.0TD', '6.1TD'
  rate_eur_kw_day numeric not null,
  valid_from date not null,
  valid_to date,
  updated_by uuid references public.user_profiles(id),
  updated_at timestamptz not null default now()
);

-- ───────── CRM ESPECÍFICO ─────────

create table public.contactos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nombre text not null,
  apellidos text,
  cargo text,
  departamento text,
  email text,
  telefono text,
  movil text,
  es_decisor boolean default false,
  es_firmante boolean default false,
  tags text[] default '{}',
  notas text,
  created_by uuid references public.user_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (empresa_id, email)
);

create table public.contratos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  contacto_firmante_id uuid references public.contactos(id),
  comercial_id uuid references public.user_profiles(id),
  numero_contrato text,
  compania text not null,                         -- nombre libre (puede no coincidir con tabla comercializadoras)
  comercializadora_id uuid references public.comercializadoras(id),
  tarifa_acceso text,
  tarifa_cliente text,
  tipo_energia text check (tipo_energia in ('electrica','gas','dual')),
  tipo_precio text check (tipo_precio in ('fijo','indexado','mixto')),
  fecha_firma date,
  fecha_inicio date,
  fecha_fin date,
  duracion_meses integer,
  consumo_sips_kwh numeric,
  consumo_po_kwh numeric,
  potencia_contratada numeric,
  comision_integra numeric,
  comision_comercial numeric,
  comision_jefe numeric,
  estado text not null default 'tramite'
    check (estado in ('tramite','activo','vencido','incidencia','baja','cancelado','borrador')),
  observaciones text,
  external_id text,
  created_by uuid references public.user_profiles(id),
  updated_by uuid references public.user_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- FK diferida cups -> contratos
alter table public.cups
  add constraint cups_contrato_fk
  foreign key (contrato_id) references public.contratos(id) on delete set null;

create table public.oportunidades (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  contacto_id uuid references public.contactos(id),
  contrato_origen_id uuid references public.contratos(id),
  comercial_id uuid references public.user_profiles(id),
  nombre text not null,
  tipo text not null check (tipo in ('electrica','gas','dual','solar')),
  etapa text not null default 'prospecto'
    check (etapa in ('prospecto','auditoria_consumo','oferta_presentada','negociacion','contrato_firmado','activo','cerrada_ganada','cerrada_perdida')),
  probabilidad_pct integer not null default 10,
  valor_estimado_eur numeric,
  ahorro_anual_estimado numeric,
  fecha_cierre_prevista date,
  motivo_perdida text,
  tags text[] default '{}',
  notas text,
  external_id text,
  created_by uuid references public.user_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.actividades (
  id uuid primary key default gen_random_uuid(),
  entidad_tipo text not null,                     -- 'empresa', 'contrato', 'oportunidad', etc.
  entidad_id uuid not null,
  tipo text not null check (tipo in ('llamada','reunion','email','tarea','nota','visita')),
  titulo text not null,
  descripcion text,
  fecha_actividad timestamptz not null,
  fecha_vencimiento timestamptz,
  duracion_min integer,
  prioridad text check (prioridad in ('baja','media','alta','urgente')),
  estado_tarea text,
  resultado text,
  privada boolean not null default false,
  adjunto_nombre text,
  adjunto_url text,
  asignado_a uuid references public.user_profiles(id),
  usuario_id uuid references public.user_profiles(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index actividades_entidad_idx on public.actividades (entidad_tipo, entidad_id);

-- ───────── POTENCIAS ESPECÍFICO ─────────

create table public.expedientes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  cups_id uuid not null references public.cups(id) on delete cascade,
  anio integer not null,
  estado text not null,
  tipo_normativa text not null,
  ciclos_realizados integer not null default 0,
  max_ciclos_permitidos integer,
  notas text,
  created_by uuid references public.user_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ciclos (
  id uuid primary key default gen_random_uuid(),
  expediente_id uuid not null references public.expedientes(id) on delete cascade,
  numero_ciclo integer not null,
  estado text not null,
  ahorro_previsto_total numeric,
  ahorro_real_total numeric,
  created_at timestamptz not null default now()
);

create table public.solicitudes_potencia (        -- renombrada desde power_requests
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
  -- Fechas importantes del flujo
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
  created_by uuid references public.user_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ───────── EXCEDENTES ESPECÍFICO ─────────

create table public.comercializadora_docs (
  id uuid primary key default gen_random_uuid(),
  comercializadora_id uuid not null references public.comercializadoras(id) on delete cascade,
  nombre text not null,
  descripcion text,
  nombre_archivo text not null,
  storage_path text not null,
  tamano_bytes integer,
  campos_detectados jsonb not null default '{}',
  campos_mapeados jsonb not null default '{}',
  instrucciones text,
  es_plantilla_autorizacion boolean not null default false,
  subido_por uuid references public.user_profiles(id),
  created_at timestamptz not null default now()
);

create table public.savings_calculations (
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
  fecha_calculo timestamptz not null default now()
);

-- ───────── COMPARTIDAS (tras unificar de ambos lados) ─────────

create table public.documentos (
  id uuid primary key default gen_random_uuid(),
  entidad_tipo text,                              -- polimórfico: 'empresa','contrato','cups','expediente','ciclo','incidencia'
  entidad_id uuid,
  empresa_id uuid references public.empresas(id),
  cups_id uuid references public.cups(id),
  expediente_id uuid references public.expedientes(id),
  ciclo_id uuid references public.ciclos(id),
  nombre text not null,
  nombre_archivo text,
  nombre_original text,
  tipo text,
  descripcion text,
  mime_type text,
  tamano_bytes bigint,
  ruta_storage text not null,
  metadata jsonb,
  notas text,
  subido_por uuid references public.user_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  deleted_at timestamptz
);

create index documentos_entidad_idx on public.documentos (entidad_tipo, entidad_id);
create index documentos_empresa_idx on public.documentos (empresa_id);

create table public.comunicaciones_cliente (      -- de client_communications
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  ciclo_id uuid references public.ciclos(id),
  expediente_id uuid references public.expedientes(id),
  tipo text not null,
  asunto text not null,
  cuerpo_html text not null,
  destinatario_email text not null,
  cc_email text,
  estado text not null,
  fecha_envio timestamptz,
  resend_message_id text,
  error_detalle text,
  enviado_por uuid references public.user_profiles(id),
  created_at timestamptz not null default now()
);

create table public.alertas (                     -- de alerts
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id),
  cups_id uuid references public.cups(id),
  expediente_id uuid references public.expedientes(id),
  ciclo_id uuid references public.ciclos(id),
  request_id uuid references public.solicitudes_potencia(id),
  tipo text not null,
  mensaje text not null,
  fecha_alerta date not null,
  leida boolean not null default false,
  leida_por uuid references public.user_profiles(id),
  fecha_lectura timestamptz,
  created_at timestamptz not null default now()
);

-- ───────── CRM ADICIONALES (sin equivalente en Potencias) ─────────

create table public.propuestas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  oportunidad_id uuid references public.oportunidades(id),
  compania_propuesta text,
  tarifa_propuesta text,
  precio_kwh numeric,
  potencia numeric,
  comision_estimada numeric,
  ahorro_estimado_pct numeric,
  fecha_envio timestamptz,
  fecha_respuesta timestamptz,
  fecha_validez date,
  estado text not null default 'borrador',
  version integer not null default 1,
  datos_json jsonb,
  pdf_url text,
  notas_cliente text,
  creada_por uuid references public.user_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.comercializadora_ofertas (    -- renombrada desde retailer_offers
  id uuid primary key default gen_random_uuid(),
  comercializadora_id uuid references public.comercializadoras(id),
  product_name text,
  access_rate text,
  energy_prices numeric[],
  power_prices numeric[],
  activation_fee_eur numeric,
  annual_management_fee_eur numeric,
  entry_fee_eur numeric,
  entry_fee_per_kw numeric,
  min_contract_months integer,
  tender_fee_pct numeric,
  allow_zero_invoice boolean,
  battery_fee_per_kwp_eur numeric,
  surplus_model text,
  surplus_price_per_kwh numeric,
  include_in_comparison boolean,
  show_tolls_separately boolean,
  notes text,
  created_at timestamptz default now()
);

create table public.facturas (
  id uuid primary key default gen_random_uuid(),
  cups_id uuid references public.cups(id),
  year integer not null,
  month integer not null,
  billed_days integer,
  retailer text,
  consumption_kwh numeric,
  consumption_p1 numeric, consumption_p2 numeric, consumption_p3 numeric,
  consumption_p4 numeric, consumption_p5 numeric, consumption_p6 numeric,
  surplus_kwh numeric,
  surplus_p1 numeric, surplus_p2 numeric, surplus_p3 numeric,
  surplus_p4 numeric, surplus_p5 numeric, surplus_p6 numeric,
  surplus_compensation_eur numeric,
  total_amount_eur numeric,
  created_at timestamptz default now()
);

create table public.incidencias (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  contrato_id uuid references public.contratos(id),
  cups_id uuid references public.cups(id),
  tipo text,
  estado text not null default 'abierta',
  prioridad text,
  asunto text not null,
  descripcion text,
  asignado_a uuid references public.user_profiles(id),
  fecha_apertura timestamptz not null default now(),
  fecha_objetivo_resolucion date,
  fecha_resolucion timestamptz,
  created_by uuid references public.user_profiles(id),
  updated_at timestamptz not null default now()
);

create table public.renovaciones (
  id uuid primary key default gen_random_uuid(),
  contrato_origen_id uuid not null references public.contratos(id) on delete cascade,
  oportunidad_id uuid references public.oportunidades(id),
  estado text not null default 'pendiente',
  fecha_renovacion_prevista date,
  notas text,
  created_at timestamptz not null default now()
);

create table public.eventos (
  id uuid primary key default gen_random_uuid(),
  entidad_tipo text not null,
  entidad_id uuid not null,
  titulo text not null,
  descripcion text,
  fecha_inicio timestamptz not null,
  fecha_fin timestamptz,
  todo_el_dia boolean default false,
  usuario_id uuid references public.user_profiles(id),
  created_at timestamptz not null default now()
);

create table public.notificaciones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.user_profiles(id) on delete cascade,
  tipo text not null,
  mensaje text not null,
  entidad_tipo text,
  entidad_id uuid,
  leida boolean not null default false,
  fecha_lectura timestamptz,
  created_at timestamptz not null default now()
);

create table public.tareas (                      -- legacy, puede unificarse con actividades tipo='tarea'
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id),
  contrato_id uuid references public.contratos(id),
  oportunidad_id uuid references public.oportunidades(id),
  titulo text not null,
  descripcion text,
  fecha_vencimiento date,
  completada boolean not null default false,
  asignado_a uuid,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Custom fields polimórfico (ya estaba en CRM)

create table public.custom_fields_schema (
  id uuid primary key default gen_random_uuid(),
  entidad_tipo text not null,                     -- 'empresa', 'oportunidad'
  slug text not null,
  label text not null,
  tipo text not null,                             -- 'text','textarea','number','date','boolean','select','multiselect'
  opciones jsonb,                                 -- para select/multiselect
  placeholder text,
  help_text text,
  obligatorio boolean default false,
  orden integer default 0,
  activo boolean default true,
  created_at timestamptz default now(),
  unique (entidad_tipo, slug)
);

create table public.custom_fields_values (
  id uuid primary key default gen_random_uuid(),
  entidad_tipo text not null,
  entidad_id uuid not null,
  field_slug text not null,
  valor jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (entidad_tipo, entidad_id, field_slug)
);

-- Datadis integración

create table public.datadis_tokens (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references public.user_profiles(id),
  token text not null,
  expira_en timestamptz,
  created_at timestamptz default now()
);

create table public.datadis_consumptions (
  id uuid primary key default gen_random_uuid(),
  cups_id uuid not null references public.cups(id),
  fecha date not null,
  hora integer not null check (hora between 0 and 23),
  consumo_kwh numeric not null,
  tipo_energia text,
  created_at timestamptz default now()
);

-- Global config (del CRM)

create table public.global_config (
  id uuid primary key default gen_random_uuid(),
  clave text not null unique,
  valor jsonb,
  descripcion text,
  updated_at timestamptz default now(),
  updated_by uuid references public.user_profiles(id)
);

-- Email templates + import templates (de Potencias)

create table public.email_templates (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo text not null,
  asunto text not null,
  cuerpo_html text not null,
  variables_disponibles jsonb,
  activo boolean not null default true,
  updated_by uuid references public.user_profiles(id),
  updated_at timestamptz not null default now()
);

create table public.excel_import_templates (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  comercializadora_id uuid references public.comercializadoras(id),
  header_row integer not null default 1,
  sheet_name text,
  campos_mapeados jsonb not null default '{}',
  creado_por uuid references public.user_profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Status log (histórico cambios de estado, sin FK rígidas)

create table public.status_log (
  id uuid primary key default gen_random_uuid(),
  entidad_tipo text,
  entidad_id uuid,
  expediente_id uuid references public.expedientes(id),
  ciclo_id uuid references public.ciclos(id),
  request_id uuid references public.solicitudes_potencia(id),
  estado_anterior text,
  estado_nuevo text not null,
  fecha_cambio timestamptz not null default now(),
  cambiado_por uuid references public.user_profiles(id),
  notas text
);

-- Asistente RAG (ya existe del sprint 3, se mantiene igual)

create table public.crm_help_embeddings (
  id uuid primary key default gen_random_uuid(),
  source_path text not null,
  section text not null default 'general',
  title text not null,
  chunk_index int not null default 0,
  chunk_text text not null,
  embedding extensions.vector(768) not null,
  source_url text,
  created_at timestamptz not null default now()
);

create index crm_help_embeddings_hnsw_idx
  on public.crm_help_embeddings
  using hnsw (embedding extensions.vector_cosine_ops);
create index crm_help_embeddings_section_idx on public.crm_help_embeddings (section);
```

---

## Scripts de migración de datos

### Orden estricto (por dependencias)

1. **Catálogos maestros** (sin FK a nada):
   - `comercializadoras` — fusión dedup por nombre normalizado.
   - `precios_regulados_boe` — fusión de `boe_regulated_prices` + `regulated_rates`.
   - `email_templates` — copia directa.
   - `global_config` — copia directa.

2. **Users**:
   - `user_profiles` — fusión por email (el `profiles` de Potencias es poco, el del CRM es más completo).

3. **Entidades core** (con FK a catálogos y users):
   - `empresas` — dedup por CIF/NIF.
   - `cups` — dedup por código_cups.

4. **Entidades dependientes**:
   - `contactos` (CRM → canónica).
   - `contratos` (CRM → canónica).
   - `cups.contrato_id` — populate tras contratos.
   - `oportunidades`.
   - `comercializadora_ofertas` (retailer_offers con FK re-mapeada).
   - `comercializadora_docs`.
   - `expedientes`.
   - `ciclos`.
   - `solicitudes_potencia` (power_requests con FKs re-mapeadas).
   - `savings_calculations`.
   - `actividades`.
   - `tareas`.
   - `propuestas`.
   - `facturas`.

5. **Log y auxiliares** (cross-entity):
   - `documentos` (consolidación de 3 tablas: `client_documents` + `expediente_documents` + `comercializadora_docs` + `documentacion`).
   - `comunicaciones_cliente`.
   - `alertas`.
   - `status_log`.
   - `incidencias`, `renovaciones`, `eventos`, `notificaciones`.
   - `custom_fields_*`.
   - `datadis_*`.
   - `excel_import_templates`.

### Script de dedupe de empresas (ejemplo concreto)

```sql
-- Se ejecuta DESPUÉS de haber poblado empresas desde el CRM
-- y ANTES de insertar las de Potencias.

-- Función para normalizar CIF/NIF
create or replace function normalizar_cif(input text) returns text language sql immutable as $$
  select upper(regexp_replace(coalesce(input, ''), '[\s\-\.]', '', 'g'));
$$;

-- Paso 1: insertar empresas del CRM tal cual (1 a 1)
insert into public.empresas (
  id, cif_nif, nombre_fiscal, email_contacto, telefono_principal,
  direccion_fiscal, codigo_postal, ciudad, provincia, pais,
  tipo, segmento, tags, notas, web,
  comercial_id, external_id, legacy_crm_id,
  created_by, updated_by,
  created_at, updated_at, deleted_at
)
select
  e.id,
  normalizar_cif(e.nif),
  e.nombre,
  e.email_principal,
  e.telefono_principal,
  e.direccion,
  e.cp,
  e.ciudad,
  e.provincia,
  coalesce(e.pais, 'ES'),
  e.tipo,
  e.segmento,
  coalesce(e.tags, '{}'),
  e.notas,
  e.web,
  e.comercial_id,
  e.external_id,
  e.id,                                    -- legacy_crm_id = su propio id del CRM
  e.created_by,
  e.updated_by,
  e.created_at,
  e.updated_at,
  e.deleted_at
from crm_source.empresas e                 -- conectado via postgres_fdw o dump-restore
on conflict (id) do nothing;

-- Paso 2: insertar empresas de Potencias con dedupe por CIF normalizado
with potencia_empresas as (
  select
    c.id as legacy_potencia_id,
    normalizar_cif(c.cif) as cif_norm,
    c.nombre_fiscal,
    c.persona_contacto,
    c.email_contacto,
    c.telefono,
    c.direccion_fiscal,
    c.codigo_postal,
    c.ciudad,
    c.notas,
    c.activo,
    c.asesor_id,
    c.gestor_id,                           -- mapear a comercial_id
    c.created_by,
    c.created_at
  from potencia_source.clients c
)
insert into public.empresas (
  cif_nif, nombre_fiscal, persona_contacto, email_contacto,
  telefono_principal, direccion_fiscal, codigo_postal, ciudad,
  notas, activo, asesor_id, comercial_id, legacy_potencia_id,
  created_by, created_at
)
select
  pe.cif_norm,
  pe.nombre_fiscal,
  pe.persona_contacto,
  pe.email_contacto,
  pe.telefono,
  pe.direccion_fiscal,
  pe.codigo_postal,
  pe.ciudad,
  pe.notas,
  pe.activo,
  pe.asesor_id,
  pe.gestor_id,
  pe.legacy_potencia_id,
  pe.created_by,
  pe.created_at
from potencia_empresas pe
where not exists (
  select 1 from public.empresas e
  where normalizar_cif(e.cif_nif) = pe.cif_norm
    and pe.cif_norm is not null
    and pe.cif_norm != ''
);

-- Paso 3: para los que SÍ coinciden (empresa en ambos) → actualizar legacy_potencia_id en la fila del CRM
update public.empresas e
set legacy_potencia_id = pe.legacy_potencia_id
from (
  select c.id as legacy_potencia_id, normalizar_cif(c.cif) as cif_norm
  from potencia_source.clients c
  where normalizar_cif(c.cif) != ''
) pe
where normalizar_cif(e.cif_nif) = pe.cif_norm
  and e.legacy_potencia_id is null;
```

Pattern análogo para CUPS, comercializadoras, etc.

### Tabla de mapeo legacy → canónico

Crear tabla temporal durante la migración para re-mapear FKs:

```sql
create table _migration_empresa_map (
  legacy_crm_id uuid,
  legacy_potencia_id uuid,
  canonical_id uuid
);

insert into _migration_empresa_map (legacy_crm_id, legacy_potencia_id, canonical_id)
select legacy_crm_id, legacy_potencia_id, id
from public.empresas;
```

Luego cuando insertes `expedientes` de Potencias:

```sql
insert into public.expedientes (
  empresa_id, cups_id, anio, estado, tipo_normativa,
  ciclos_realizados, max_ciclos_permitidos, notas,
  created_by, created_at, updated_at
)
select
  m.canonical_id,                          -- re-mapear empresa_id
  mc.canonical_id,                         -- re-mapear cups_id
  e.anio,
  e.estado,
  e.tipo_normativa,
  e.ciclos_realizados,
  e.max_ciclos_permitidos,
  e.notas,
  e.created_by,
  e.created_at,
  e.updated_at
from potencia_source.expedientes e
join _migration_empresa_map m on m.legacy_potencia_id = e.client_id
join _migration_cups_map mc on mc.legacy_potencia_id = e.supply_id;
```

---

## Plan de rollback

Si algo va mal en cualquier momento:

1. **Antes de Fase 2 (carga de datos)**:
   - El proyecto canónico tiene solo schema vacío.
   - Rollback: dropear el proyecto canónico, volver a los 2 proyectos originales intactos.
   - Tiempo: 5 minutos.

2. **Durante Fase 2 (cargando datos)**:
   - Truncate de todas las tablas del proyecto canónico.
   - Re-ejecutar scripts desde cero.
   - Tiempo: 30 min - 2h según el punto donde falló.

3. **Después de Fase 3 (apps ya apuntan al nuevo)**:
   - Rollback apuntando de nuevo apps a los proyectos originales.
   - Requiere cambio de env vars en Cloudflare/Vercel.
   - Tiempo: 15 min despliegue.
   - **Los 2 proyectos originales se mantienen intactos durante TODAS las fases** — solo se borran en Fase 5 tras 1 semana estable.

---

## Scripts de verificación post-migración

```sql
-- Después de Fase 2, correr estas verificaciones:

-- 1. Contadores comparados
select 'empresas' as tabla, count(*) as filas from public.empresas
union all select 'cups', count(*) from public.cups
union all select 'contratos', count(*) from public.contratos
union all select 'contactos', count(*) from public.contactos
union all select 'oportunidades', count(*) from public.oportunidades
union all select 'expedientes', count(*) from public.expedientes
union all select 'ciclos', count(*) from public.ciclos
union all select 'solicitudes_potencia', count(*) from public.solicitudes_potencia
union all select 'savings_calculations', count(*) from public.savings_calculations
union all select 'actividades', count(*) from public.actividades
union all select 'documentos', count(*) from public.documentos;

-- Comparar con los contadores previos (que se guardan antes de migración).

-- 2. Integridad referencial (debe dar 0 filas)
select count(*) from public.contratos c
where not exists (select 1 from public.empresas e where e.id = c.empresa_id);

select count(*) from public.cups c
where not exists (select 1 from public.empresas e where e.id = c.empresa_id);

select count(*) from public.expedientes ex
where not exists (select 1 from public.empresas e where e.id = ex.empresa_id);

-- 3. Duplicados por CIF (debe dar 0 filas)
select cif_nif, count(*) as duplicados
from public.empresas
where cif_nif is not null and cif_nif != ''
group by cif_nif
having count(*) > 1;

-- 4. CUPS duplicados (debe dar 0 filas)
select codigo_cups, count(*)
from public.cups
group by codigo_cups
having count(*) > 1;

-- 5. Orphans (FKs rotas)
select 'expedientes orphans' as check, count(*) from public.expedientes ex
  where not exists (select 1 from public.cups c where c.id = ex.cups_id)
union all
select 'ciclos orphans', count(*) from public.ciclos cc
  where not exists (select 1 from public.expedientes ex where ex.id = cc.expediente_id)
union all
select 'solicitudes orphans', count(*) from public.solicitudes_potencia sp
  where not exists (select 1 from public.ciclos cc where cc.id = sp.ciclo_id);
```

---

## RLS policies canónicas

```sql
-- Habilitar RLS en todas las tablas relevantes
alter table public.empresas enable row level security;
alter table public.contactos enable row level security;
alter table public.contratos enable row level security;
alter table public.cups enable row level security;
alter table public.oportunidades enable row level security;
alter table public.actividades enable row level security;
alter table public.expedientes enable row level security;
alter table public.ciclos enable row level security;
alter table public.solicitudes_potencia enable row level security;
alter table public.savings_calculations enable row level security;
alter table public.documentos enable row level security;
alter table public.user_profiles enable row level security;
alter table public.incidencias enable row level security;
alter table public.renovaciones enable row level security;
alter table public.notificaciones enable row level security;

-- Función helper para obtener rol del usuario actual
create or replace function public.get_user_rol() returns text language sql stable
security invoker
set search_path = public
as $$
  select rol from public.user_profiles where id = auth.uid();
$$;

-- Policy patrón para comerciales (solo ven sus asignados)
create policy "empresas_comercial_ver_sus"
  on public.empresas for select
  to authenticated
  using (
    comercial_id = auth.uid()
    or public.get_user_rol() in ('manager', 'master')
  );

create policy "empresas_comercial_editar_sus"
  on public.empresas for update
  to authenticated
  using (
    comercial_id = auth.uid()
    or public.get_user_rol() in ('manager', 'master')
  );

-- Patrón análogo para contratos, cups, oportunidades, actividades, etc.
-- (se repite el pattern con la columna apropiada: comercial_id / asignado_a / created_by).

-- user_profiles: cualquier authed ve todos (necesario para menciones y listados), solo admin edita otros
create policy "user_profiles_ver_todos" on public.user_profiles
  for select to authenticated using (true);

create policy "user_profiles_editar_mi" on public.user_profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "user_profiles_admin_todo" on public.user_profiles
  for all to authenticated
  using (public.get_user_rol() = 'master')
  with check (public.get_user_rol() = 'master');
```

---

## Siguiente paso

Cuando Juan dé go para el sprint de unificación:

1. **Fase 1**: snapshot de los 2 proyectos + crear proyecto canónico con el schema de este documento.
2. **Fase 2**: ejecutar los scripts de migración de datos en el orden definido.
3. **Fase 3-5**: las descritas en `docs/PLAN_UNIFICACION_SUPABASE.md`.

**Estimación revisada gracias a la Fase 0 ya hecha**: el sprint total pasa de 10-12 días a **7-9 días persona**, al tener el schema canónico y la estrategia de dedupe definidos.
