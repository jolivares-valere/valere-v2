-- ═══════════════════════════════════════════════════════════════════════
-- Migración: Mantenimiento externo + Workflow de informes FV
-- ═══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- BLOQUE 1: MANTENIMIENTO EXTERNO
-- Contexto: el mantenimiento lo hacen empresas externas (no Valere).
-- Valere registra quién lo hace, qué se hace y cuándo, para tener trazabilidad
-- y saber cuándo hay que programar la próxima intervención.
-- ─────────────────────────────────────────────────────────────────────

-- Registro de empresas externas de mantenimiento
CREATE TABLE IF NOT EXISTS public.fv_empresa_mantenimiento (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre           TEXT NOT NULL,
  cif              TEXT,
  telefono         TEXT,
  email            TEXT,
  contacto_nombre  TEXT,            -- persona de contacto en la empresa
  contrato_ref     TEXT,            -- referencia del contrato de mantenimiento
  contrato_inicio  DATE,
  contrato_fin     DATE,
  notas            TEXT,
  activo           BOOLEAN NOT NULL DEFAULT true,
  creado_en        TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.fv_empresa_mantenimiento IS
  'Empresas externas que realizan el mantenimiento de las plantas FV.';

-- Vincular empresa mantenimiento con planta (una planta puede cambiar de empresa)
-- y una empresa puede mantener varias plantas
ALTER TABLE public.fv_planta
  ADD COLUMN IF NOT EXISTS empresa_mant_id UUID
    REFERENCES public.fv_empresa_mantenimiento(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contrato_mant_ref    TEXT,    -- referencia contrato mantenimiento
  ADD COLUMN IF NOT EXISTS garantia_hasta        DATE,
  ADD COLUMN IF NOT EXISTS empresa_instaladora   TEXT;   -- nombre instalador (texto libre)

-- Registro de intervenciones de mantenimiento
CREATE TABLE IF NOT EXISTS public.fv_mantenimiento (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planta_id             UUID NOT NULL REFERENCES public.fv_planta(id)               ON DELETE CASCADE,
  empresa_mant_id       UUID REFERENCES public.fv_empresa_mantenimiento(id)         ON DELETE SET NULL,
  tipo                  TEXT NOT NULL CHECK (tipo IN (
                          'revision_preventiva',  -- revisión periódica programada
                          'revision_correctiva',  -- reparación por fallo
                          'limpieza_modulos',     -- limpieza de paneles
                          'inspeccion',           -- inspección técnica / termografía
                          'actualizacion_fw',     -- actualización firmware inversores
                          'otro'
                        )),
  estado                TEXT NOT NULL DEFAULT 'programado' CHECK (estado IN (
                          'programado',   -- fecha fijada, pendiente de realizar
                          'realizado',    -- ya completado
                          'cancelado',    -- cancelado o pospuesto
                          'pendiente'     -- detectado, sin fecha fijada aún
                        )),
  fecha_programada      DATE,
  fecha_realizada       DATE,
  tecnico_nombre        TEXT,          -- nombre del técnico que realizó la intervención
  descripcion           TEXT,          -- qué se hizo / qué se encontró
  observaciones         TEXT,          -- notas adicionales / anomalías detectadas
  coste_eur             NUMERIC(10,2),
  proxima_revision      DATE,          -- cuando se estima la siguiente revisión
  documentos_urls       TEXT[],        -- enlaces a partes de trabajo, fotos, etc.
  creado_por            UUID REFERENCES public.user_profiles(id),
  creado_en             TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.fv_mantenimiento IS
  'Intervenciones de mantenimiento de plantas FV: preventivo, correctivo, limpiezas.
   Realizadas por empresas externas. Valere registra para trazabilidad y alertas.';

-- Índices
CREATE INDEX IF NOT EXISTS idx_fv_mant_planta ON public.fv_mantenimiento(planta_id);
CREATE INDEX IF NOT EXISTS idx_fv_mant_fecha  ON public.fv_mantenimiento(fecha_programada);
CREATE INDEX IF NOT EXISTS idx_fv_mant_estado ON public.fv_mantenimiento(estado);

-- Trigger updated_at
CREATE TRIGGER trg_fv_mantenimiento_updated
  BEFORE UPDATE ON public.fv_mantenimiento
  FOR EACH ROW EXECUTE FUNCTION moddatetime(actualizado_en);

CREATE TRIGGER trg_fv_empresa_mant_updated
  BEFORE UPDATE ON public.fv_empresa_mantenimiento
  FOR EACH ROW EXECUTE FUNCTION moddatetime(actualizado_en);

-- RLS
ALTER TABLE public.fv_empresa_mantenimiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fv_mantenimiento         ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fv_empresa_mant_read_all_auth"
  ON public.fv_empresa_mantenimiento FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "fv_empresa_mant_write_admin"
  ON public.fv_empresa_mantenimiento FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('admin','superadmin'))
  );

CREATE POLICY "fv_mantenimiento_read_auth"
  ON public.fv_mantenimiento FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "fv_mantenimiento_write_admin"
  ON public.fv_mantenimiento FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('admin','superadmin'))
  );


-- ─────────────────────────────────────────────────────────────────────
-- BLOQUE 2: WORKFLOW DE INFORMES
-- Contexto:
--   - El informe mensual se genera automáticamente el día 1
--   - Pasa por un flujo de revisión antes de enviarse al cliente
--   - El gestor de la cuenta puede editar, aprobar y enviar
--   - Puede configurarse por cliente como "revisión previa" o "automático"
--   - Se envía al cliente + copia a asesores asignados
-- ─────────────────────────────────────────────────────────────────────

-- Configuración de envío de informes por empresa/cliente
CREATE TABLE IF NOT EXISTS public.fv_config_informe (
  empresa_id            UUID PRIMARY KEY REFERENCES public.empresas(id) ON DELETE CASCADE,
  modo_envio            TEXT NOT NULL DEFAULT 'revision_previa' CHECK (modo_envio IN (
                          'revision_previa',  -- gestor revisa antes de enviar
                          'automatico'        -- se envía automáticamente sin revisión
                        )),
  gestor_id             UUID REFERENCES public.user_profiles(id),   -- quién revisa (ej. Julia Ruiz)
  asesor_id             UUID REFERENCES public.user_profiles(id),   -- asesor de cuenta (ej. Juan Olivares)
  destinatarios_cliente TEXT[] NOT NULL DEFAULT '{}',               -- emails del cliente
  destinatarios_copia   TEXT[] NOT NULL DEFAULT '{}',               -- emails en copia (asesores, etc.)
  dia_envio             SMALLINT NOT NULL DEFAULT 5                 -- día del mes para envío
                          CHECK (dia_envio BETWEEN 1 AND 28),
  incluir_fv            BOOLEAN NOT NULL DEFAULT true,
  incluir_facturas      BOOLEAN NOT NULL DEFAULT true,
  incluir_actuaciones   BOOLEAN NOT NULL DEFAULT true,
  activo                BOOLEAN NOT NULL DEFAULT true,
  notas                 TEXT,
  creado_en             TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.fv_config_informe IS
  'Configuración de entrega de informes mensuales por cliente.
   Controla modo de envío, destinatarios, gestor revisor y secciones a incluir.';

CREATE TRIGGER trg_fv_config_informe_updated
  BEFORE UPDATE ON public.fv_config_informe
  FOR EACH ROW EXECUTE FUNCTION moddatetime(actualizado_en);

ALTER TABLE public.fv_config_informe ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fv_config_informe_admin"
  ON public.fv_config_informe FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('admin','superadmin'))
  );

CREATE POLICY "fv_config_informe_gestor_read"
  ON public.fv_config_informe FOR SELECT
  USING (gestor_id = auth.uid() OR asesor_id = auth.uid());


-- Extender fv_informe_mensual con el flujo de estados
ALTER TABLE public.fv_informe_mensual
  ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'borrador' CHECK (estado IN (
    'borrador',            -- generado por sync, sin revisar
    'revision_pendiente',  -- listo para que el gestor lo revise
    'en_revision',         -- el gestor lo está revisando/editando
    'aprobado',            -- gestor ha aprobado, listo para enviar
    'enviado',             -- enviado al cliente
    'fallido'              -- error al enviar
  )),
  ADD COLUMN IF NOT EXISTS gestor_id        UUID REFERENCES public.user_profiles(id),
  ADD COLUMN IF NOT EXISTS contenido_editado JSONB,   -- cambios manuales del gestor
  ADD COLUMN IF NOT EXISTS notas_gestor      TEXT,    -- notas internas del gestor
  ADD COLUMN IF NOT EXISTS aprobado_en       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS enviado_en        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS destinatarios     JSONB,   -- snapshot de emails usados al enviar
  ADD COLUMN IF NOT EXISTS error_envio       TEXT;    -- mensaje de error si estado=fallido

COMMENT ON TABLE public.fv_informe_mensual IS
  'Informes mensuales FV por empresa. Flujo: borrador → revision_pendiente → aprobado → enviado.
   El gestor puede editar contenido_editado antes de aprobar. Si modo=automatico, salta la revisión.';

-- Índice para buscar informes pendientes de revisión
CREATE INDEX IF NOT EXISTS idx_fv_informe_estado
  ON public.fv_informe_mensual(estado, empresa_id);


-- ─────────────────────────────────────────────────────────────────────
-- BLOQUE 3: NOTIFICACIONES internas para revisión de informes
-- Cuando un informe pasa a revision_pendiente, notificar al gestor
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fv_notificar_informe_pendiente()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_gestor_id UUID;
  v_empresa_nombre TEXT;
BEGIN
  -- Solo actuar cuando cambia a revision_pendiente
  IF NEW.estado = 'revision_pendiente' AND
     (OLD.estado IS DISTINCT FROM 'revision_pendiente') THEN

    -- Obtener gestor configurado
    SELECT gestor_id INTO v_gestor_id
    FROM public.fv_config_informe
    WHERE empresa_id = NEW.empresa_id;

    SELECT nombre INTO v_empresa_nombre
    FROM public.empresas WHERE id = NEW.empresa_id;

    -- Crear notificación CRM si hay gestor configurado
    IF v_gestor_id IS NOT NULL THEN
      INSERT INTO public.notificaciones (
        user_id, tipo, titulo, mensaje, entidad_tipo, entidad_id
      ) VALUES (
        v_gestor_id,
        'informe_fv_pendiente',
        'Informe FV pendiente de revisión',
        'El informe de ' || to_char(NEW.mes, 'Month YYYY') ||
        ' de ' || COALESCE(v_empresa_nombre, 'cliente') || ' está listo para revisar.',
        'fv_informe_mensual',
        NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_fv_informe_notificar
  AFTER INSERT OR UPDATE OF estado ON public.fv_informe_mensual
  FOR EACH ROW EXECUTE FUNCTION public.fv_notificar_informe_pendiente();
