-- ═══════════════════════════════════════════════════════════════════
-- Migration: Fase 2 RAG — Setup asistente documentación CRM
-- Fecha: 2026-04-24
-- Autor: Cowork (sprint autónomo)
-- ═══════════════════════════════════════════════════════════════════
--
-- Esta migration prepara Supabase para el asistente RAG del CRM:
--   1. Activa extensión pgvector (necesaria para embeddings semánticos).
--   2. Crea tabla crm_help_embeddings para almacenar los chunks + vectores.
--   3. Índice HNSW para búsqueda por similitud coseno.
--   4. Función match_crm_help para consultas RAG.
--   5. RLS policy: lectura autenticada para todos los usuarios del CRM.
--
-- NO modifica ningún dato existente. Solo crea objetos nuevos.
--
-- Ver docs/PLAN_ASISTENTE_RAG_CRM.md para contexto completo.
-- ═══════════════════════════════════════════════════════════════════

-- 1. Extensión pgvector
create extension if not exists vector with schema extensions;

-- 2. Tabla de embeddings
create table if not exists public.crm_help_embeddings (
  id uuid primary key default gen_random_uuid(),
  source_path text not null,               -- "docs/help/empresas/crear-empresa.md"
  section text not null default 'general', -- "empresas", "oportunidades", etc.
  title text not null,                     -- del frontmatter del .md
  chunk_index int not null default 0,      -- 0, 1, 2... orden dentro del doc
  chunk_text text not null,
  embedding extensions.vector(768) not null, -- text-embedding-004 dimensions
  source_url text,                         -- link a GitHub
  created_at timestamptz not null default now()
);

-- 3. Índice HNSW para búsqueda por similitud coseno
create index if not exists crm_help_embeddings_hnsw_idx
  on public.crm_help_embeddings
  using hnsw (embedding extensions.vector_cosine_ops);

-- Índice auxiliar para filtrar por sección
create index if not exists crm_help_embeddings_section_idx
  on public.crm_help_embeddings (section);

-- 4. Función de búsqueda semántica
create or replace function public.match_crm_help(
  query_embedding extensions.vector(768),
  match_count int default 5,
  filter_section text default null
)
returns table (
  source_path text,
  section text,
  title text,
  chunk_text text,
  source_url text,
  similarity float
)
language sql stable
security invoker
set search_path = public, extensions
as $$
  select
    e.source_path,
    e.section,
    e.title,
    e.chunk_text,
    e.source_url,
    1 - (e.embedding <=> query_embedding) as similarity
  from public.crm_help_embeddings e
  where (filter_section is null or e.section = filter_section)
  order by e.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

-- 5. RLS policies
alter table public.crm_help_embeddings enable row level security;

-- Lectura: cualquier usuario autenticado (los compañeros Valere usan el asistente)
drop policy if exists "crm_help_embeddings_read_authenticated" on public.crm_help_embeddings;
create policy "crm_help_embeddings_read_authenticated"
  on public.crm_help_embeddings
  for select
  to authenticated
  using (true);

-- Escritura: solo service_role (la regenera el script de embeddings en CI)
drop policy if exists "crm_help_embeddings_write_service_role" on public.crm_help_embeddings;
create policy "crm_help_embeddings_write_service_role"
  on public.crm_help_embeddings
  for all
  to service_role
  using (true)
  with check (true);

-- Comentarios descriptivos
comment on table public.crm_help_embeddings is
  'Embeddings de docs/help/*.md para el asistente RAG del CRM. Regenerado automáticamente por GitHub Action cuando cambia la doc.';
comment on function public.match_crm_help(extensions.vector, int, text) is
  'Búsqueda semántica sobre crm_help_embeddings. Usado por la Edge Function ask-crm-docs.';
