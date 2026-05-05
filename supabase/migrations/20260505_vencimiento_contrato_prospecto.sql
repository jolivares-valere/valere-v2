-- VENCIMIENTO CONTRATO PROSPECTO — Captación
-- Aplicado en BD prod via MCP 2026-05-05
--
-- Origen: feedback Juan + ChatGPT 2026-05-05 — "el dato más comercial
-- que existe es cuándo le vence el contrato actual al prospecto;
-- semáforo 90/60/30 días dispara contacto comercial".
--
-- Decisión arquitectónica: NO contaminar la tabla `contratos` real (CRM).
-- Vive en `oportunidades` como info comercial de captación, aislada del CRM.
-- Cuando el prospecto se convierte a cliente y firmamos un contrato real,
-- entonces sí se crea fila en `contratos` con la fecha real.

-- =====================================================
-- A) Schema aditivo en oportunidades
-- =====================================================
ALTER TABLE public.oportunidades
  ADD COLUMN IF NOT EXISTS fecha_vencimiento_contrato_prospecto date,
  ADD COLUMN IF NOT EXISTS fuente_vencimiento_contrato_prospecto text,
  ADD COLUMN IF NOT EXISTS notas_vencimiento_contrato_prospecto text;

ALTER TABLE public.oportunidades
  DROP CONSTRAINT IF EXISTS oportunidades_fuente_vencimiento_check,
  ADD CONSTRAINT oportunidades_fuente_vencimiento_check
    CHECK (
      fuente_vencimiento_contrato_prospecto IS NULL
      OR fuente_vencimiento_contrato_prospecto IN (
        'cliente_llamada','factura','email','estimado','desconocido'
      )
    );

COMMENT ON COLUMN public.oportunidades.fecha_vencimiento_contrato_prospecto IS
  'Fecha estimada/conocida de vencimiento del contrato actual del PROSPECTO. Info comercial de captación, NO es contrato CRM. Activa semáforos 90/60/30 días.';

COMMENT ON COLUMN public.oportunidades.fuente_vencimiento_contrato_prospecto IS
  'Cómo conocemos la fecha: cliente_llamada / factura / email / estimado / desconocido.';

COMMENT ON COLUMN public.oportunidades.notas_vencimiento_contrato_prospecto IS
  'Observaciones libres: condiciones, penalización por cancelación anticipada, etc.';

-- =====================================================
-- B) Actualizar RPC crear_lead_captacion para aceptar vencimiento
-- =====================================================
-- (Versión aplicada en prod: v4. Se añaden 3 parámetros opcionales.)
CREATE OR REPLACE FUNCTION public.crear_lead_captacion(
  p_empresa_nombre   text,
  p_empresa_nif      text DEFAULT NULL,
  p_empresa_telefono text DEFAULT NULL,
  p_empresa_email    text DEFAULT NULL,
  p_empresa_ciudad   text DEFAULT NULL,
  p_empresa_segmento text DEFAULT 'comercial',
  p_contactos        jsonb DEFAULT '[]'::jsonb,
  p_origen           text DEFAULT 'cold',
  p_notas            text DEFAULT NULL,
  p_fecha_vencimiento_contrato date DEFAULT NULL,
  p_fuente_vencimiento         text DEFAULT NULL,
  p_notas_vencimiento          text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id      uuid := auth.uid();
  v_funciones    text[];
  v_empresa_id   uuid;
  v_oportunidad_id uuid;
  v_contacto_record jsonb;
  v_contacto_id  uuid;
  v_es_principal_count int := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  -- Permisos: cualquier rol operativo puede crear leads de captación
  SELECT funciones INTO v_funciones FROM public.user_profiles WHERE id = v_user_id;
  IF v_funciones IS NULL OR NOT (
    v_funciones && ARRAY['admin','asesor_senior','captacion','analista','tramitador']::text[]
  ) THEN
    RAISE EXCEPTION 'Sin permisos para crear leads';
  END IF;

  -- Empresa nueva (PROSPECTO desde captación)
  INSERT INTO public.empresas (
    nombre, nif, telefono_principal, email_principal, ciudad, segmento,
    estado_relacion, origen_relacion
  ) VALUES (
    p_empresa_nombre, p_empresa_nif, p_empresa_telefono, p_empresa_email,
    p_empresa_ciudad, p_empresa_segmento,
    'prospecto', 'captacion'
  )
  RETURNING id INTO v_empresa_id;

  -- Contactos (si vienen)
  IF p_contactos IS NOT NULL AND jsonb_array_length(p_contactos) > 0 THEN
    FOR v_contacto_record IN SELECT * FROM jsonb_array_elements(p_contactos)
    LOOP
      INSERT INTO public.contactos (
        empresa_id, nombre, cargo, telefono, email, es_principal
      ) VALUES (
        v_empresa_id,
        NULLIF(v_contacto_record->>'nombre',''),
        NULLIF(v_contacto_record->>'cargo',''),
        NULLIF(v_contacto_record->>'telefono',''),
        NULLIF(v_contacto_record->>'email',''),
        COALESCE((v_contacto_record->>'es_principal')::boolean, false)
      )
      RETURNING id INTO v_contacto_id;

      IF COALESCE((v_contacto_record->>'es_principal')::boolean, false) THEN
        v_es_principal_count := v_es_principal_count + 1;
      END IF;
    END LOOP;

    -- Si nadie está marcado principal, marcar el primero
    IF v_es_principal_count = 0 THEN
      UPDATE public.contactos
        SET es_principal = true
        WHERE id = (
          SELECT id FROM public.contactos
            WHERE empresa_id = v_empresa_id
            ORDER BY created_at ASC
            LIMIT 1
        );
    END IF;
  END IF;

  -- Oportunidad (contexto=captacion, etapa_operativa=nuevo)
  INSERT INTO public.oportunidades (
    empresa_id, tipo, etapa, etapa_operativa, contexto,
    nombre, notas, responsable_actual_id, creador_id, origen,
    fecha_vencimiento_contrato_prospecto,
    fuente_vencimiento_contrato_prospecto,
    notas_vencimiento_contrato_prospecto
  ) VALUES (
    v_empresa_id,
    'cambio_comercializadora',
    'prospeccion',
    'nuevo',
    'captacion',
    p_empresa_nombre,
    p_notas,
    v_user_id,
    v_user_id,
    p_origen,
    p_fecha_vencimiento_contrato,
    p_fuente_vencimiento,
    p_notas_vencimiento
  )
  RETURNING id INTO v_oportunidad_id;

  RETURN v_oportunidad_id;
END;
$$;

REVOKE ALL ON FUNCTION public.crear_lead_captacion FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.crear_lead_captacion TO authenticated;

-- =====================================================
-- C) Actualizar RPC actualizar_lead_captacion con flag opcional
-- =====================================================
-- v3: añade p_actualizar_vencimiento boolean. Si true, persiste los 3 campos
-- (incluyendo nulls para borrar). Si false, no toca nada.
-- Esto permite al frontend distinguir "limpiar fecha" de "no enviar el campo".
CREATE OR REPLACE FUNCTION public.actualizar_lead_captacion(
  p_oportunidad_id    uuid,
  p_empresa_nombre    text,
  p_empresa_nif       text DEFAULT NULL,
  p_empresa_telefono  text DEFAULT NULL,
  p_empresa_email     text DEFAULT NULL,
  p_empresa_ciudad    text DEFAULT NULL,
  p_empresa_segmento  text DEFAULT NULL,
  p_contactos         jsonb DEFAULT '[]'::jsonb,
  p_notas             text DEFAULT NULL,
  p_fecha_vencimiento_contrato date DEFAULT NULL,
  p_fuente_vencimiento         text DEFAULT NULL,
  p_notas_vencimiento          text DEFAULT NULL,
  p_actualizar_vencimiento     boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id     uuid := auth.uid();
  v_funciones   text[];
  v_empresa_id  uuid;
  v_responsable uuid;
  v_creador     uuid;
  v_contacto_record jsonb;
  v_contacto_id uuid;
  v_es_principal_count int := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT funciones INTO v_funciones FROM public.user_profiles WHERE id = v_user_id;
  IF v_funciones IS NULL OR NOT (
    v_funciones && ARRAY['admin','asesor_senior','captacion','analista','tramitador']::text[]
  ) THEN
    RAISE EXCEPTION 'Sin permisos para editar leads';
  END IF;

  SELECT empresa_id, responsable_actual_id, creador_id
    INTO v_empresa_id, v_responsable, v_creador
    FROM public.oportunidades
    WHERE id = p_oportunidad_id AND deleted_at IS NULL;

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Oportunidad no encontrada';
  END IF;

  -- Ownership: responsable, creador o admin/asesor_senior
  IF NOT (
    v_responsable = v_user_id
    OR v_creador = v_user_id
    OR v_funciones && ARRAY['admin','asesor_senior']::text[]
  ) THEN
    RAISE EXCEPTION 'Sin permiso para editar este lead';
  END IF;

  -- Empresa
  UPDATE public.empresas SET
    nombre = COALESCE(p_empresa_nombre, nombre),
    nif    = COALESCE(p_empresa_nif, nif),
    telefono_principal = COALESCE(p_empresa_telefono, telefono_principal),
    email_principal = COALESCE(p_empresa_email, email_principal),
    ciudad = COALESCE(p_empresa_ciudad, ciudad),
    segmento = COALESCE(p_empresa_segmento, segmento),
    updated_at = now()
  WHERE id = v_empresa_id;

  -- Contactos: tres operaciones
  IF p_contactos IS NOT NULL THEN
    FOR v_contacto_record IN SELECT * FROM jsonb_array_elements(p_contactos)
    LOOP
      -- a) Eliminar (soft) si _eliminar=true y tiene id
      IF COALESCE((v_contacto_record->>'_eliminar')::boolean, false)
         AND v_contacto_record->>'id' IS NOT NULL THEN
        UPDATE public.contactos
          SET deleted_at = now()
          WHERE id = (v_contacto_record->>'id')::uuid
            AND empresa_id = v_empresa_id;
        CONTINUE;
      END IF;

      -- b) Update si tiene id
      IF v_contacto_record->>'id' IS NOT NULL THEN
        UPDATE public.contactos SET
          nombre = NULLIF(v_contacto_record->>'nombre',''),
          cargo = NULLIF(v_contacto_record->>'cargo',''),
          telefono = NULLIF(v_contacto_record->>'telefono',''),
          email = NULLIF(v_contacto_record->>'email',''),
          es_principal = COALESCE((v_contacto_record->>'es_principal')::boolean, false),
          updated_at = now()
        WHERE id = (v_contacto_record->>'id')::uuid
          AND empresa_id = v_empresa_id;
      ELSE
        -- c) Insert nuevo
        INSERT INTO public.contactos (
          empresa_id, nombre, cargo, telefono, email, es_principal
        ) VALUES (
          v_empresa_id,
          NULLIF(v_contacto_record->>'nombre',''),
          NULLIF(v_contacto_record->>'cargo',''),
          NULLIF(v_contacto_record->>'telefono',''),
          NULLIF(v_contacto_record->>'email',''),
          COALESCE((v_contacto_record->>'es_principal')::boolean, false)
        ) RETURNING id INTO v_contacto_id;
      END IF;

      IF COALESCE((v_contacto_record->>'es_principal')::boolean, false) THEN
        v_es_principal_count := v_es_principal_count + 1;
      END IF;
    END LOOP;

    -- Si quedó algún contacto activo y ninguno es principal, marcar el más antiguo
    IF v_es_principal_count = 0 THEN
      UPDATE public.contactos
        SET es_principal = true
        WHERE id = (
          SELECT id FROM public.contactos
            WHERE empresa_id = v_empresa_id
              AND deleted_at IS NULL
            ORDER BY created_at ASC
            LIMIT 1
        );
    END IF;
  END IF;

  -- Oportunidad: notas + (opcional) bloque vencimiento
  UPDATE public.oportunidades SET
    notas = COALESCE(p_notas, notas),
    fecha_vencimiento_contrato_prospecto = CASE
      WHEN p_actualizar_vencimiento THEN p_fecha_vencimiento_contrato
      ELSE fecha_vencimiento_contrato_prospecto
    END,
    fuente_vencimiento_contrato_prospecto = CASE
      WHEN p_actualizar_vencimiento THEN p_fuente_vencimiento
      ELSE fuente_vencimiento_contrato_prospecto
    END,
    notas_vencimiento_contrato_prospecto = CASE
      WHEN p_actualizar_vencimiento THEN p_notas_vencimiento
      ELSE notas_vencimiento_contrato_prospecto
    END,
    updated_at = now()
  WHERE id = p_oportunidad_id;

  RETURN jsonb_build_object(
    'oportunidad_id', p_oportunidad_id,
    'empresa_id', v_empresa_id,
    'ok', true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.actualizar_lead_captacion FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.actualizar_lead_captacion TO authenticated;
