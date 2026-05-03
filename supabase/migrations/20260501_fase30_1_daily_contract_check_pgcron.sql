-- =====================================================================
-- FASE 30.1 — Programar daily-contract-check vía pg_cron + función SQL
--
-- En lugar de llamar a la Edge Function por HTTP (requiere secret + pg_net),
-- replicamos la lógica en plpgsql: más atómico, menos secretos.
-- La Edge Function `supabase/functions/daily-contract-check/` queda como
-- backup manual / referencia (se puede invocar desde dashboard si hace falta).
--
-- Aplicada en producción (gtphkowfcuiqbvfkwjxb) por Cowork 2026-05-01 vía MCP.
-- Cron jobid=3, schedule '0 4 * * *', active=true.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.run_daily_contract_check()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_today                 date := current_date;
  v_in60                  date := current_date + INTERVAL '60 days';
  v_vencidos_count        int := 0;
  v_oportunidades_count   int := 0;
  v_tareas_count          int := 0;
  v_notif_count           int := 0;
  v_errores               text[] := ARRAY[]::text[];
  c                       record;
  v_existente_id          uuid;
  v_nueva_oport_id        uuid;
  v_fecha_aviso           timestamptz;
BEGIN
  -- ───────────────────────────────────────────────────────────────────
  -- 1. Marcar contratos vencidos (estado=activo, fecha_fin < today)
  -- ───────────────────────────────────────────────────────────────────
  FOR c IN
    UPDATE public.contratos
       SET estado = 'vencido',
           updated_at = now()
     WHERE estado = 'activo'
       AND deleted_at IS NULL
       AND fecha_fin IS NOT NULL
       AND fecha_fin < v_today
    RETURNING id, empresa_id, comercial_id, numero_contrato
  LOOP
    v_vencidos_count := v_vencidos_count + 1;
    BEGIN
      INSERT INTO public.actividades (
        tipo, titulo, descripcion, entidad_tipo, entidad_id, fecha_actividad
      ) VALUES (
        'cambio_estado',
        'Contrato marcado como vencido',
        'Rollover diario: estado activo -> vencido',
        'contrato',
        c.id,
        now()
      );
    EXCEPTION WHEN OTHERS THEN
      v_errores := array_append(v_errores, 'act_venc ' || c.id || ': ' || SQLERRM);
    END;
  END LOOP;

  -- ───────────────────────────────────────────────────────────────────
  -- 2. Para contratos que vencen en ≤60 días sin oportunidad de
  --    renovación abierta, crear oportunidad + tarea + notificación.
  -- ───────────────────────────────────────────────────────────────────
  FOR c IN
    SELECT id, empresa_id, comercial_id, numero_contrato, fecha_fin
      FROM public.contratos
     WHERE estado = 'activo'
       AND deleted_at IS NULL
       AND fecha_fin IS NOT NULL
       AND fecha_fin >= v_today
       AND fecha_fin <= v_in60
  LOOP
    SELECT id INTO v_existente_id
      FROM public.oportunidades
     WHERE contrato_origen_id = c.id
       AND tipo = 'renovacion'
       AND etapa NOT IN ('ganada','perdida','cancelada','cerrada_ganada','cerrada_perdida')
       AND deleted_at IS NULL
     LIMIT 1;
    IF v_existente_id IS NOT NULL THEN
      CONTINUE;
    END IF;

    BEGIN
      INSERT INTO public.oportunidades (
        empresa_id, contrato_origen_id, comercial_id,
        tipo, nombre, etapa, probabilidad_pct
      ) VALUES (
        c.empresa_id, c.id, c.comercial_id,
        'renovacion',
        'Renovacion ' || COALESCE(c.numero_contrato, c.id::text),
        'prospecto',
        30
      )
      RETURNING id INTO v_nueva_oport_id;
      v_oportunidades_count := v_oportunidades_count + 1;
    EXCEPTION WHEN OTHERS THEN
      v_errores := array_append(v_errores, 'oport ' || c.id || ': ' || SQLERRM);
      CONTINUE;
    END;

    IF c.comercial_id IS NOT NULL THEN
      v_fecha_aviso := (c.fecha_fin - INTERVAL '30 days')::timestamptz;
      BEGIN
        INSERT INTO public.actividades (
          tipo, titulo, entidad_tipo, entidad_id,
          asignado_a, estado_tarea, fecha_vencimiento, fecha_actividad
        ) VALUES (
          'tarea',
          'Contactar para renovacion de contrato ' || COALESCE(c.numero_contrato, ''),
          'oportunidad', v_nueva_oport_id,
          c.comercial_id, 'pendiente', v_fecha_aviso, now()
        );
        v_tareas_count := v_tareas_count + 1;
      EXCEPTION WHEN OTHERS THEN
        v_errores := array_append(v_errores, 'tarea ' || c.id || ': ' || SQLERRM);
      END;

      BEGIN
        INSERT INTO public.notificaciones (
          usuario_id, tipo, titulo, cuerpo, entidad_tipo, entidad_id
        ) VALUES (
          c.comercial_id,
          'renovacion_creada',
          'Nueva oportunidad de renovacion',
          'Contrato ' || COALESCE(c.numero_contrato, c.id::text)
            || ' vence el ' || c.fecha_fin::text || '.',
          'oportunidad', v_nueva_oport_id
        );
        v_notif_count := v_notif_count + 1;
      EXCEPTION WHEN OTHERS THEN
        v_errores := array_append(v_errores, 'notif ' || c.id || ': ' || SQLERRM);
      END;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'ejecutado_en', now(),
    'vencidos', v_vencidos_count,
    'oportunidades_creadas', v_oportunidades_count,
    'tareas_creadas', v_tareas_count,
    'notificaciones_creadas', v_notif_count,
    'errores', v_errores
  );
END;
$function$;

COMMENT ON FUNCTION public.run_daily_contract_check IS
  'FASE 30.1 — Rollover diario de contratos: vence + crea oportunidad de renovación + tarea + notificación. Idempotente. Programada vía pg_cron.';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily_contract_check') THEN
    PERFORM cron.unschedule('daily_contract_check');
  END IF;
END $$;

SELECT cron.schedule(
  'daily_contract_check',
  '0 4 * * *',
  $cron$ SELECT public.run_daily_contract_check(); $cron$
);

-- Hardening: la función SECURITY DEFINER NO debe ser invocable por anon/authenticated.
-- Sólo postgres (que corre cron) la ejecuta. Cierra warnings 0028/0029 del advisor.
REVOKE EXECUTE ON FUNCTION public.run_daily_contract_check() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.run_daily_contract_check() FROM anon;
REVOKE EXECUTE ON FUNCTION public.run_daily_contract_check() FROM authenticated;
