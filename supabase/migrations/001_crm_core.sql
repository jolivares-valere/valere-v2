-- ============================================================================
-- VALERE CRM · Migration 001 · Core Schema
-- ============================================================================
-- Fase 1 del núcleo del CRM modular.
--   * Soft delete en todas las tablas (deleted_at timestamptz)
--   * RLS habilitado en todas (las policies van en 002_rls_policies.sql)
--   * external_id en empresas, contratos y oportunidades (sync CRM externo)
--   * UUIDs generados con gen_random_uuid()
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. users_profile  (extiende auth.users)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users_profile (
  id               uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre_completo  text NOT NULL,
  rol              text NOT NULL DEFAULT 'comercial'
                     CHECK (rol IN ('admin','jefe_equipo','comercial','visor')),
  activo           boolean NOT NULL DEFAULT true,
  avatar_url       text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 2. empresas
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS empresas (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre             text NOT NULL,
  nif                text UNIQUE,
  tipo               text CHECK (tipo IN (
                       'empresa','autonomo','comunidad_propietarios',
                       'cooperativa','asociacion'
                     )),
  segmento           text CHECK (segmento IN (
                       'industrial','comercial','servicios',
                       'agricola','residencial_colectivo'
                     )),
  email_principal    text,
  telefono_principal text,
  web                text,
  direccion          text,
  cp                 text,
  ciudad             text,
  provincia          text,
  pais               text DEFAULT 'ES',
  comercial_id       uuid REFERENCES users_profile(id) ON DELETE SET NULL,
  notas              text,
  tags               text[] DEFAULT '{}',
  external_id        text,
  deleted_at         timestamptz,
  created_by         uuid REFERENCES users_profile(id),
  updated_by         uuid REFERENCES users_profile(id),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 3. contactos
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contactos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id   uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nombre       text NOT NULL,
  apellidos    text,
  email        text,
  telefono     text,
  movil        text,
  cargo        text,
  departamento text,
  es_decisor   boolean NOT NULL DEFAULT false,
  es_firmante  boolean NOT NULL DEFAULT false,
  notas        text,
  tags         text[] DEFAULT '{}',
  deleted_at   timestamptz,
  created_by   uuid REFERENCES users_profile(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 4. contratos
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contratos (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id           uuid NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  contacto_firmante_id uuid REFERENCES contactos(id) ON DELETE SET NULL,
  comercial_id         uuid REFERENCES users_profile(id) ON DELETE SET NULL,
  numero_contrato      text,
  compania             text NOT NULL,
  tarifa_acceso        text,
  tarifa_cliente       text,
  tipo_energia         text CHECK (tipo_energia IN ('electrica','gas','dual')),
  tipo_precio          text CHECK (tipo_precio IN ('fijo','indexado','mixto')),
  fecha_firma          date,
  fecha_inicio         date,
  fecha_fin            date,
  duracion_meses       integer,
  consumo_sips_kwh     numeric(14,2),
  consumo_po_kwh       numeric(14,2),
  potencia_contratada  numeric(10,3),
  comision_integra     numeric(12,2),
  comision_comercial   numeric(12,2),
  comision_jefe        numeric(12,2),
  estado               text NOT NULL DEFAULT 'borrador' CHECK (estado IN (
                         'borrador','tramite','activo','vencido',
                         'baja','incidencia','cancelado'
                       )),
  observaciones        text,
  external_id          text,
  deleted_at           timestamptz,
  created_by           uuid REFERENCES users_profile(id),
  updated_by           uuid REFERENCES users_profile(id),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 5. cups  (N CUPS por contrato)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cups (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id          uuid NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  empresa_id           uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  codigo_cups          text NOT NULL UNIQUE,
  direccion_suministro text,
  distribuidor         text,
  estado               text NOT NULL DEFAULT 'pendiente'
                         CHECK (estado IN ('activo','baja','pendiente')),
  deleted_at           timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 6. oportunidades  (pipeline de ventas y renovaciones)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS oportunidades (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id             uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  contrato_origen_id     uuid REFERENCES contratos(id) ON DELETE SET NULL,
  comercial_id           uuid REFERENCES users_profile(id) ON DELETE SET NULL,
  tipo                   text NOT NULL CHECK (tipo IN (
                           'nueva_venta','renovacion','ampliacion','recuperacion'
                         )),
  nombre                 text NOT NULL,
  etapa                  text NOT NULL DEFAULT 'prospecto' CHECK (etapa IN (
                           'prospecto','contactado','analisis','propuesta_enviada',
                           'negociacion','ganada','perdida','cancelada'
                         )),
  probabilidad_pct       integer NOT NULL DEFAULT 20
                           CHECK (probabilidad_pct BETWEEN 0 AND 100),
  valor_estimado_eur     numeric(14,2),
  fecha_cierre_prevista  date,
  motivo_perdida         text,
  notas                  text,
  tags                   text[] DEFAULT '{}',
  external_id            text,
  deleted_at             timestamptz,
  created_by             uuid REFERENCES users_profile(id),
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 7. actividades  (log polimórfico universal)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS actividades (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo              text NOT NULL CHECK (tipo IN (
                      'llamada','email','reunion','tarea','nota',
                      'cambio_estado','documento','whatsapp','visita'
                    )),
  titulo            text NOT NULL,
  descripcion       text,
  fecha_actividad   timestamptz NOT NULL DEFAULT now(),
  duracion_min      integer,
  resultado         text CHECK (resultado IN (
                      'positivo','neutral','negativo','sin_respuesta'
                    )),
  estado_tarea      text CHECK (estado_tarea IN (
                      'pendiente','completada','cancelada'
                    )),
  fecha_vencimiento timestamptz,
  entidad_tipo      text NOT NULL CHECK (entidad_tipo IN (
                      'empresa','contacto','contrato','oportunidad'
                    )),
  entidad_id        uuid NOT NULL,
  usuario_id        uuid REFERENCES users_profile(id) ON DELETE SET NULL,
  asignado_a        uuid REFERENCES users_profile(id) ON DELETE SET NULL,
  adjunto_url       text,
  adjunto_nombre    text,
  privada           boolean NOT NULL DEFAULT false,
  deleted_at        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 8. propuestas
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS propuestas (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oportunidad_id       uuid REFERENCES oportunidades(id) ON DELETE CASCADE,
  empresa_id           uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  creada_por           uuid REFERENCES users_profile(id) ON DELETE SET NULL,
  version              integer NOT NULL DEFAULT 1,
  compania_propuesta   text,
  tarifa_propuesta     text,
  precio_kwh           numeric(10,5),
  potencia             numeric(10,3),
  ahorro_estimado_pct  numeric(5,2),
  comision_estimada    numeric(12,2),
  estado               text NOT NULL DEFAULT 'borrador' CHECK (estado IN (
                         'borrador','enviada','vista','aceptada',
                         'rechazada','caducada'
                       )),
  fecha_envio          timestamptz,
  fecha_validez        date,
  fecha_respuesta      timestamptz,
  notas_cliente        text,
  pdf_url              text,
  datos_json           jsonb,
  deleted_at           timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 9. custom_fields_schema
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS custom_fields_schema (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad_tipo   text NOT NULL CHECK (entidad_tipo IN (
                   'empresa','contacto','contrato','oportunidad'
                 )),
  nombre_campo   text NOT NULL,
  etiqueta       text NOT NULL,
  tipo_dato      text NOT NULL CHECK (tipo_dato IN (
                   'texto','numero','fecha','booleano','lista','multiselect'
                 )),
  opciones_lista jsonb,
  obligatorio    boolean NOT NULL DEFAULT false,
  orden          integer NOT NULL DEFAULT 0,
  activo         boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entidad_tipo, nombre_campo)
);

-- ----------------------------------------------------------------------------
-- 10. custom_fields_values
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS custom_fields_values (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schema_id    uuid NOT NULL REFERENCES custom_fields_schema(id) ON DELETE CASCADE,
  entidad_id   uuid NOT NULL,
  valor_texto  text,
  valor_numero numeric,
  valor_fecha  timestamptz,
  valor_json   jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (schema_id, entidad_id)
);

-- ----------------------------------------------------------------------------
-- 11. notificaciones
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notificaciones (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id   uuid NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  tipo         text,
  titulo       text,
  cuerpo       text,
  entidad_tipo text,
  entidad_id   uuid,
  leida        boolean NOT NULL DEFAULT false,
  leida_at     timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- ÍNDICES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_empresas_nif          ON empresas (nif);
CREATE INDEX IF NOT EXISTS idx_empresas_comercial    ON empresas (comercial_id);
CREATE INDEX IF NOT EXISTS idx_empresas_active       ON empresas (deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_contratos_empresa     ON contratos (empresa_id);
CREATE INDEX IF NOT EXISTS idx_contratos_estado      ON contratos (estado);
CREATE INDEX IF NOT EXISTS idx_contratos_fecha_fin   ON contratos (fecha_fin);
CREATE INDEX IF NOT EXISTS idx_contratos_comercial   ON contratos (comercial_id);

CREATE INDEX IF NOT EXISTS idx_cups_codigo           ON cups (codigo_cups);
CREATE INDEX IF NOT EXISTS idx_cups_contrato         ON cups (contrato_id);
CREATE INDEX IF NOT EXISTS idx_cups_empresa          ON cups (empresa_id);

CREATE INDEX IF NOT EXISTS idx_oport_empresa         ON oportunidades (empresa_id);
CREATE INDEX IF NOT EXISTS idx_oport_etapa           ON oportunidades (etapa);
CREATE INDEX IF NOT EXISTS idx_oport_tipo            ON oportunidades (tipo);
CREATE INDEX IF NOT EXISTS idx_oport_comercial       ON oportunidades (comercial_id);

CREATE INDEX IF NOT EXISTS idx_actividades_entidad   ON actividades (entidad_tipo, entidad_id);
CREATE INDEX IF NOT EXISTS idx_actividades_usuario   ON actividades (usuario_id);
CREATE INDEX IF NOT EXISTS idx_actividades_fecha     ON actividades (fecha_actividad DESC);

CREATE INDEX IF NOT EXISTS idx_cfv_schema_entidad    ON custom_fields_values (schema_id, entidad_id);

-- ============================================================================
-- TRIGGER: mantener updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users_profile','empresas','contactos','contratos',
    'oportunidades','propuestas','custom_fields_values'
  ] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%1$s_updated ON %1$s;
       CREATE TRIGGER trg_%1$s_updated BEFORE UPDATE ON %1$s
       FOR EACH ROW EXECUTE FUNCTION set_updated_at();', t);
  END LOOP;
END $$;

-- ============================================================================
-- VIEWS
-- ============================================================================

-- 1. v_contratos_activos
CREATE OR REPLACE VIEW v_contratos_activos AS
SELECT
  c.*,
  e.nombre            AS empresa_nombre,
  e.nif               AS empresa_nif,
  u.nombre_completo   AS comercial_nombre,
  (c.fecha_fin - CURRENT_DATE) AS dias_para_vencimiento,
  CASE
    WHEN c.fecha_fin IS NULL                     THEN 'ok'
    WHEN (c.fecha_fin - CURRENT_DATE) < 15       THEN 'critica'
    WHEN (c.fecha_fin - CURRENT_DATE) <= 30      THEN 'alta'
    WHEN (c.fecha_fin - CURRENT_DATE) <= 60      THEN 'media'
    WHEN (c.fecha_fin - CURRENT_DATE) <= 90      THEN 'baja'
    ELSE 'ok'
  END AS prioridad_renovacion
FROM contratos c
LEFT JOIN empresas e       ON e.id = c.empresa_id
LEFT JOIN users_profile u  ON u.id = c.comercial_id
WHERE c.estado = 'activo' AND c.deleted_at IS NULL;

-- 2. v_oportunidades_huerfanas
CREATE OR REPLACE VIEW v_oportunidades_huerfanas AS
SELECT va.*
FROM v_contratos_activos va
WHERE va.fecha_fin IS NOT NULL
  AND va.fecha_fin <= (CURRENT_DATE + INTERVAL '90 days')
  AND NOT EXISTS (
    SELECT 1 FROM oportunidades o
    WHERE o.contrato_origen_id = va.id
      AND o.tipo = 'renovacion'
      AND o.etapa NOT IN ('ganada','perdida','cancelada')
      AND o.deleted_at IS NULL
  );

-- 3. v_dashboard_comercial
CREATE OR REPLACE VIEW v_dashboard_comercial AS
SELECT
  u.id                AS comercial_id,
  u.nombre_completo,
  COUNT(DISTINCT c.id) FILTER (
    WHERE c.estado = 'activo' AND c.deleted_at IS NULL
  ) AS contratos_activos,
  COUNT(DISTINCT c.id) FILTER (
    WHERE c.estado = 'activo' AND c.deleted_at IS NULL
      AND c.fecha_fin IS NOT NULL
      AND c.fecha_fin <= (CURRENT_DATE + INTERVAL '30 days')
  ) AS vencen_30d,
  COUNT(DISTINCT c.id) FILTER (
    WHERE c.estado = 'activo' AND c.deleted_at IS NULL
      AND c.fecha_fin IS NOT NULL
      AND c.fecha_fin <= (CURRENT_DATE + INTERVAL '60 days')
  ) AS vencen_60d,
  COALESCE(SUM(c.comision_integra) FILTER (
    WHERE c.fecha_firma >= date_trunc('month', CURRENT_DATE)
      AND c.fecha_firma <  date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
      AND c.deleted_at IS NULL
  ), 0) AS comision_integra_mes_actual
FROM users_profile u
LEFT JOIN contratos c ON c.comercial_id = u.id
WHERE u.activo = true
GROUP BY u.id, u.nombre_completo;

-- ============================================================================
-- RLS · habilitar en todas las tablas (policies en 002_rls_policies.sql)
-- ============================================================================
ALTER TABLE users_profile        ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE contactos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE cups                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE oportunidades        ENABLE ROW LEVEL SECURITY;
ALTER TABLE actividades          ENABLE ROW LEVEL SECURITY;
ALTER TABLE propuestas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_fields_schema ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_fields_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones       ENABLE ROW LEVEL SECURITY;