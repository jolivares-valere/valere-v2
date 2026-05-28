-- =====================================================================
-- FASE 1 · Migración 04/09 — Tabla tariff_extractions
-- =====================================================================
-- Resultado de la extracción IA sobre un tariff_document.
-- Permite reextracción (varias filas por document_id) y auditoría.
-- =====================================================================

create table if not exists public.tariff_extractions (
  id                  uuid primary key default gen_random_uuid(),
  document_id         uuid not null
    references public.tariff_documents(id) on delete cascade,
  model_name          text not null,
  raw_response_json   jsonb,
  structured_json     jsonb,
  confidence_score    numeric
    check (confidence_score is null or (confidence_score >= 0 and confidence_score <= 1)),
  proposed_action     text
    check (proposed_action in ('create_new','update_existing','duplicate','reject')),
  proposed_oferta_id  uuid
    references public.comercializadora_ofertas(id) on delete set null,
  status              text not null default 'pending'
    check (status in ('pending','validated','rejected','error')),
  error_message       text,
  created_at          timestamptz default now() not null,
  validated_by        uuid references public.user_profiles(id),
  validated_at        timestamptz
);

create index if not exists idx_tariff_extractions_document_id
  on public.tariff_extractions(document_id);

create index if not exists idx_tariff_extractions_status
  on public.tariff_extractions(status);

alter table public.tariff_extractions enable row level security;

drop policy if exists tariff_extractions_all_approved on public.tariff_extractions;
create policy tariff_extractions_all_approved
  on public.tariff_extractions
  for all
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles
       where id = auth.uid() and approved = true
    )
  )
  with check (
    exists (
      select 1 from public.user_profiles
       where id = auth.uid() and approved = true
    )
  );

NOTIFY pgrst, 'reload schema';
