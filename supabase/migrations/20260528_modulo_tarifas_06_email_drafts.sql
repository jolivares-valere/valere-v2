-- =====================================================================
-- FASE 1 · Migración 06/09 — Tabla proposal_email_drafts
-- =====================================================================
-- Borrador de email asociado a una propuesta. Estado pendiente de
-- aprobación → aprobado → enviado vía Resend (Fase 6).
-- =====================================================================

create table if not exists public.proposal_email_drafts (
  id                  uuid primary key default gen_random_uuid(),
  proposal_id         uuid not null
    references public.proposals(id) on delete cascade,
  to_email            text not null,
  cc_email            text,
  bcc_email           text,
  subject             text not null,
  body_html           text not null,
  body_text           text,
  status              text not null default 'draft'
    check (status in ('draft','pending_review','approved','sent','rejected','error')),
  created_by          uuid references public.user_profiles(id),
  approved_by         uuid references public.user_profiles(id),
  approved_at         timestamptz,
  sent_at             timestamptz,
  error_message       text,
  resend_message_id   text,
  created_at          timestamptz default now() not null,
  updated_at          timestamptz default now() not null
);

create index if not exists idx_email_drafts_proposal_id
  on public.proposal_email_drafts(proposal_id);

create index if not exists idx_email_drafts_status
  on public.proposal_email_drafts(status);

alter table public.proposal_email_drafts enable row level security;

drop policy if exists email_drafts_all_approved on public.proposal_email_drafts;
create policy email_drafts_all_approved
  on public.proposal_email_drafts
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
