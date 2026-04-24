-- ═══════════════════════════════════════════════════════════════════
-- Migration: Tabla crm_asistente_log
-- Fecha: 2026-04-25
-- Autor: Cowork (sprint autónomo 4)
-- ═══════════════════════════════════════════════════════════════════
--
-- Logger de preguntas al asistente RAG del CRM. Sin identificar usuario
-- (RGPD), solo guardar:
--   - pregunta
--   - sección (de qué página venía)
--   - si encontró respuesta o no (para detectar gaps de doc)
--   - similarity del top match (para detectar respuestas con baja confianza)
--
-- Análisis posterior:
--   - Top 10 preguntas → indica qué docs faltan o qué tooltips inline merecen el esfuerzo.
--   - Preguntas con encontrada_respuesta=false → TODO automático para escribir nueva doc.
--   - Preguntas con baja similarity → revisar si la doc cubre el tema con suficiente claridad.
--
-- Ver docs/PLAN_ASISTENTE_RAG_CRM.md §Fase 5 (Evolución progresiva).
-- ═══════════════════════════════════════════════════════════════════

-- Activar pg_trgm si no estaba (para búsqueda fuzzy de preguntas similares)
create extension if not exists pg_trgm with schema extensions;

create table if not exists public.crm_asistente_log (
  id uuid primary key default gen_random_uuid(),
  pregunta text not null,
  pregunta_normalizada text generated always as (lower(trim(pregunta))) stored,
  seccion text,                                -- "empresas", "oportunidades", null
  encontrada_respuesta boolean not null,       -- true si chunks > 0
  num_chunks_encontrados integer not null default 0,
  top_similarity numeric,                       -- similarity del mejor match (0..1)
  provider text not null default 'gemini',     -- modelo IA usado
  duracion_ms integer,                          -- tiempo total de procesamiento
  fecha timestamptz not null default now()
  -- ⚠️ NO se guarda user_id ni IP — privacidad por diseño.
);

create index if not exists crm_asistente_log_fecha_idx
  on public.crm_asistente_log (fecha desc);

create index if not exists crm_asistente_log_seccion_idx
  on public.crm_asistente_log (seccion);

create index if not exists crm_asistente_log_no_encontrada_idx
  on public.crm_asistente_log (encontrada_respuesta, fecha desc)
  where encontrada_respuesta = false;

-- Búsqueda fuzzy de preguntas similares (para identificar duplicados frecuentes)
create index if not exists crm_asistente_log_pregunta_trgm_idx
  on public.crm_asistente_log
  using gin (pregunta_normalizada extensions.gin_trgm_ops);

-- RLS: solo admins pueden leer logs (no comerciales — privacidad equipo)
alter table public.crm_asistente_log enable row level security;

drop policy if exists "asistente_log_admin_read" on public.crm_asistente_log;
create policy "asistente_log_admin_read"
  on public.crm_asistente_log
  for select
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid()
        and role in ('master', 'manager')
    )
  );

-- Solo service_role escribe (la Edge Function ask-crm-docs)
drop policy if exists "asistente_log_service_write" on public.crm_asistente_log;
create policy "asistente_log_service_write"
  on public.crm_asistente_log
  for insert
  to service_role
  with check (true);

-- Comentarios
comment on table public.crm_asistente_log is
  'Log anonimizado de preguntas al asistente RAG del CRM. Sin user_id por privacidad. Para análisis de uso y detección de gaps de doc.';
comment on column public.crm_asistente_log.encontrada_respuesta is
  'true si match_crm_help devolvió >0 chunks. false = pregunta no cubierta por la doc actual.';
comment on column public.crm_asistente_log.top_similarity is
  'Similarity coseno del mejor chunk (0..1). Valores <0.5 indican respuesta poco fiable.';

-- Vista útil: top preguntas no respondidas en últimas 4 semanas
create or replace view public.crm_asistente_top_no_respondidas as
select
  pregunta_normalizada,
  count(*) as veces,
  max(fecha) as ultima_vez,
  array_agg(distinct seccion) as secciones
from public.crm_asistente_log
where encontrada_respuesta = false
  and fecha >= now() - interval '4 weeks'
group by pregunta_normalizada
order by count(*) desc, max(fecha) desc
limit 50;

comment on view public.crm_asistente_top_no_respondidas is
  'Top 50 preguntas que el asistente no pudo responder en las últimas 4 semanas. Cada fila representa contenido que debería añadirse a docs/help/.';
