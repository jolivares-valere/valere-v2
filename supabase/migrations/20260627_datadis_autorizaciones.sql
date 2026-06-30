-- =====================================================================
-- Migración: Módulo Datadis Autorizaciones — Fase 1
-- Fecha: 2026-06-27
-- Plan: docs/PLAN_MODULO_DATADIS_AUTORIZACIONES.md
--
-- Crea:
--   1) contactos.dni            (columna nullable, para el firmante)
--   2) datadis_autorizaciones   (registro + ciclo de vida de cada autorización)
--
-- Patrón RLS y trigger replicados de datadis_tokens (verificado en prod):
--   - get_user_rol() = 'admin'  para escritura
--   - SELECT: admin OR empresa asignada al comercial (auth.uid())
--   - trigger BEFORE UPDATE -> set_updated_at()
--
-- Seguridad: tabla nueva y vacía; columna dni nullable. No migra datos existentes.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Columna DNI del firmante en contactos
-- ---------------------------------------------------------------------
ALTER TABLE public.contactos
  ADD COLUMN IF NOT EXISTS dni TEXT;

COMMENT ON COLUMN public.contactos.dni IS
  'DNI/NIE del contacto. Usado, entre otros, como firmante en autorizaciones Datadis.';

-- ---------------------------------------------------------------------
-- 2) Tabla datadis_autorizaciones
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.datadis_autorizaciones (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Titular y firmante
  empresa_id            UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  contacto_firmante_id  UUID REFERENCES public.contactos(id) ON DELETE SET NULL,
  calidad_firmante      TEXT,            -- 'titular' | 'representante_legal' | 'apoderado'

  -- Alcance de la autorización
  alcance_cups          TEXT NOT NULL DEFAULT 'todos',   -- 'todos' | 'lista'
  cups_ids              UUID[] NOT NULL DEFAULT '{}',    -- relevante si alcance_cups = 'lista'

  -- Ciclo de vida
  estado                TEXT NOT NULL DEFAULT 'borrador',
  -- 'borrador' | 'generada' | 'enviada_cliente' | 'firmada'
  -- | 'enviada_datadis' | 'activa' | 'rechazada' | 'revocada' | 'caducada'

  -- Documento firmado archivado
  documento_id          UUID REFERENCES public.documentos(id) ON DELETE SET NULL,

  -- Metadatos legales / auditoría
  finalidad             TEXT,
  metodo_verificacion   TEXT,            -- 'cif_cups' | 'dni_cups' | 'firma_electronica'
  referencia_datadis    TEXT,            -- nº autorización en Datadis (ej. A28429348)

  -- Fechas del ciclo
  fecha_generacion      TIMESTAMPTZ,
  fecha_envio_cliente   TIMESTAMPTZ,
  fecha_firma           DATE,
  fecha_envio_datadis   TIMESTAMPTZ,
  fecha_activacion      DATE,
  fecha_vencimiento     DATE,            -- normalmente fecha_firma + 24 meses
  fecha_revocacion      DATE,

  notas                 TEXT,
  creado_por            UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT datadis_aut_alcance_chk
    CHECK (alcance_cups IN ('todos','lista')),
  CONSTRAINT datadis_aut_estado_chk
    CHECK (estado IN ('borrador','generada','enviada_cliente','firmada',
                      'enviada_datadis','activa','rechazada','revocada','caducada')),
  CONSTRAINT datadis_aut_calidad_chk
    CHECK (calidad_firmante IS NULL OR
           calidad_firmante IN ('titular','representante_legal','apoderado')),
  CONSTRAINT datadis_aut_metodo_chk
    CHECK (metodo_verificacion IS NULL OR
           metodo_verificacion IN ('cif_cups','dni_cups','firma_electronica'))
);

COMMENT ON TABLE public.datadis_autorizaciones IS
  'Autorizaciones de acceso a datos de consumo Datadis: una por empresa titular (CIF). Ciclo de vida y expediente para auditorías Datadis.';

-- Índices
CREATE INDEX IF NOT EXISTS idx_datadis_aut_empresa     ON public.datadis_autorizaciones (empresa_id);
CREATE INDEX IF NOT EXISTS idx_datadis_aut_estado      ON public.datadis_autorizaciones (estado);
CREATE INDEX IF NOT EXISTS idx_datadis_aut_vencimiento ON public.datadis_autorizaciones (fecha_vencimiento);

-- Trigger updated_at (mismo patrón que datadis_tokens)
DROP TRIGGER IF EXISTS trg_datadis_autorizaciones_updated_at ON public.datadis_autorizaciones;
CREATE TRIGGER trg_datadis_autorizaciones_updated_at
  BEFORE UPDATE ON public.datadis_autorizaciones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------
-- 3) RLS — patrón idéntico a datadis_tokens
-- ---------------------------------------------------------------------
ALTER TABLE public.datadis_autorizaciones ENABLE ROW LEVEL SECURITY;

-- SELECT: admin o comercial asignado a la empresa
DROP POLICY IF EXISTS datadis_autorizaciones_select ON public.datadis_autorizaciones;
CREATE POLICY datadis_autorizaciones_select
  ON public.datadis_autorizaciones
  FOR SELECT
  USING (
    (get_user_rol() = 'admin')
    OR (empresa_id IN (
      SELECT empresas.id FROM public.empresas
      WHERE empresas.comercial_id = (SELECT auth.uid())
    ))
  );

-- INSERT: admin
DROP POLICY IF EXISTS datadis_autorizaciones_insert ON public.datadis_autorizaciones;
CREATE POLICY datadis_autorizaciones_insert
  ON public.datadis_autorizaciones
  FOR INSERT
  WITH CHECK (get_user_rol() = 'admin');

-- UPDATE: admin
DROP POLICY IF EXISTS datadis_autorizaciones_update ON public.datadis_autorizaciones;
CREATE POLICY datadis_autorizaciones_update
  ON public.datadis_autorizaciones
  FOR UPDATE
  USING (get_user_rol() = 'admin')
  WITH CHECK (get_user_rol() = 'admin');

-- DELETE: admin
DROP POLICY IF EXISTS datadis_autorizaciones_delete ON public.datadis_autorizaciones;
CREATE POLICY datadis_autorizaciones_delete
  ON public.datadis_autorizaciones
  FOR DELETE
  USING (get_user_rol() = 'admin');
