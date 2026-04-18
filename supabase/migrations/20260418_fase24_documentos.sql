-- FASE 24 — Módulo de Documentos
-- Registro de archivos adjuntos vinculados a entidades del CRM.
-- Los archivos se almacenan en Supabase Storage (bucket 'documentos').

-- Tabla
CREATE TABLE IF NOT EXISTS public.documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad_tipo text NOT NULL CHECK (entidad_tipo IN ('empresa', 'contacto', 'contrato', 'oportunidad')),
  entidad_id uuid NOT NULL,
  nombre text NOT NULL,
  tipo text,
  ruta_storage text NOT NULL,
  tamanio bigint,
  mime_type text,
  descripcion text,
  subido_por uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_documentos_entidad ON public.documentos(entidad_tipo, entidad_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documentos_subido_por ON public.documentos(subido_por) WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documentos_all_authenticated" ON public.documentos;
CREATE POLICY "documentos_all_authenticated" ON public.documentos
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Supabase Storage bucket (idempotent — requires superuser or dashboard)
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES ('documentos', 'documentos', false, 52428800, ARRAY['application/pdf','image/png','image/jpeg','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/csv'])
-- ON CONFLICT (id) DO NOTHING;

-- Storage policies (requires storage schema access)
-- CREATE POLICY "documentos_auth_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'documentos');
-- CREATE POLICY "documentos_auth_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documentos');
-- CREATE POLICY "documentos_auth_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'documentos');

COMMENT ON TABLE public.documentos IS 'FASE 24 — Documentos adjuntos vinculados a entidades CRM.';
