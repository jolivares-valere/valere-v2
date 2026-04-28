-- ============================================================
-- FASE 20.7 — Audit Log básico (M-03 security audit)
-- Tabla audit_log + trigger genérico + función helper
-- ============================================================

-- ── 1. Tabla ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_log (
  id            uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz     NOT NULL DEFAULT now(),
  actor_id      uuid            REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email   text,
  action        text            NOT NULL,           -- INSERT | UPDATE | DELETE | LOGIN | EXPORT …
  entity_type   text            NOT NULL,           -- 'empresa' | 'contrato' | 'user_profile' …
  entity_id     text,                               -- pk de la entidad afectada (como text)
  old_values    jsonb,
  new_values    jsonb,
  ip_address    inet,
  user_agent    text,
  metadata      jsonb           DEFAULT '{}'::jsonb
);

-- índices de consulta frecuente
CREATE INDEX IF NOT EXISTS audit_log_actor_id_idx    ON public.audit_log (actor_id);
CREATE INDEX IF NOT EXISTS audit_log_entity_idx      ON public.audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS audit_log_created_at_idx  ON public.audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_action_idx      ON public.audit_log (action);

-- ── 2. RLS: solo master puede leer; nadie puede modificar desde cliente ─────
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Lectura: solo roles master o manager
CREATE POLICY "audit_log_select_master"
  ON public.audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND role IN ('master', 'manager')
    )
  );

-- Insert: solo SECURITY DEFINER functions (triggers, edge functions)
-- El cliente nunca puede insertar directamente
CREATE POLICY "audit_log_insert_system"
  ON public.audit_log FOR INSERT
  WITH CHECK (false);  -- bloqueado desde cliente; los triggers usan SECURITY DEFINER

-- ── 3. Función helper SECURITY DEFINER para insertar desde triggers ─────────
CREATE OR REPLACE FUNCTION public.audit_log_insert(
  p_actor_id    uuid,
  p_actor_email text,
  p_action      text,
  p_entity_type text,
  p_entity_id   text,
  p_old_values  jsonb DEFAULT NULL,
  p_new_values  jsonb DEFAULT NULL,
  p_metadata    jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log
    (actor_id, actor_email, action, entity_type, entity_id, old_values, new_values, metadata)
  VALUES
    (p_actor_id, p_actor_email, p_action, p_entity_type, p_entity_id, p_old_values, p_new_values, p_metadata);
END;
$$;

-- ── 4. Trigger genérico para tablas CRM ─────────────────────────────────────
-- Se instala tabla a tabla (no hay forma de un trigger dinámico en PG)
-- Captura actor de auth.uid() si está disponible (sesión Supabase JWT).

CREATE OR REPLACE FUNCTION public.trg_audit_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id    uuid;
  v_actor_email text;
  v_entity_id   text;
  v_old         jsonb := NULL;
  v_new         jsonb := NULL;
BEGIN
  -- Intentar obtener el usuario autenticado actual
  BEGIN
    v_actor_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_actor_id := NULL;
  END;

  -- Email del actor (best-effort desde user_profiles)
  IF v_actor_id IS NOT NULL THEN
    SELECT email INTO v_actor_email
    FROM public.user_profiles
    WHERE id = v_actor_id
    LIMIT 1;
  END IF;

  -- entity_id como text
  IF TG_OP = 'DELETE' THEN
    v_entity_id := (OLD.id)::text;
    v_old       := to_jsonb(OLD);
  ELSIF TG_OP = 'INSERT' THEN
    v_entity_id := (NEW.id)::text;
    v_new       := to_jsonb(NEW);
  ELSE  -- UPDATE
    v_entity_id := (NEW.id)::text;
    v_old       := to_jsonb(OLD);
    v_new       := to_jsonb(NEW);
  END IF;

  PERFORM public.audit_log_insert(
    v_actor_id,
    v_actor_email,
    TG_OP,            -- 'INSERT' | 'UPDATE' | 'DELETE'
    TG_TABLE_NAME,    -- nombre de la tabla como entity_type
    v_entity_id,
    v_old,
    v_new
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- ── 5. Instalar trigger en tablas CRM principales ────────────────────────────

-- empresas
DROP TRIGGER IF EXISTS audit_empresas ON public.empresas;
CREATE TRIGGER audit_empresas
  AFTER INSERT OR UPDATE OR DELETE ON public.empresas
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_log();

-- contratos
DROP TRIGGER IF EXISTS audit_contratos ON public.contratos;
CREATE TRIGGER audit_contratos
  AFTER INSERT OR UPDATE OR DELETE ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_log();

-- oportunidades
DROP TRIGGER IF EXISTS audit_oportunidades ON public.oportunidades;
CREATE TRIGGER audit_oportunidades
  AFTER INSERT OR UPDATE OR DELETE ON public.oportunidades
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_log();

-- contactos
DROP TRIGGER IF EXISTS audit_contactos ON public.contactos;
CREATE TRIGGER audit_contactos
  AFTER INSERT OR UPDATE OR DELETE ON public.contactos
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_log();

-- user_profiles (cambios de rol, aprobaciones)
DROP TRIGGER IF EXISTS audit_user_profiles ON public.user_profiles;
CREATE TRIGGER audit_user_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_log();

-- ── 6. Limpieza automática: borrar entradas >180 días con pg_cron ─────────
-- (Solo si pg_cron está habilitado en este proyecto Supabase)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    PERFORM cron.schedule(
      'cleanup_audit_log_180d',
      '0 4 * * 0',  -- domingos 04:00 UTC
      $$DELETE FROM public.audit_log WHERE created_at < now() - interval '180 days'$$
    );
  END IF;
END$$;

-- ── 7. Comentarios de documentación ─────────────────────────────────────────
COMMENT ON TABLE public.audit_log IS
  'Registro inmutable de cambios en entidades CRM. Solo insert por triggers SECURITY DEFINER.';
COMMENT ON COLUMN public.audit_log.action IS
  'Tipo de acción: INSERT | UPDATE | DELETE | LOGIN | EXPORT | APPROVE | REJECT | …';
COMMENT ON COLUMN public.audit_log.entity_type IS
  'Nombre de la tabla/entidad afectada (empresas, contratos, oportunidades, …)';
