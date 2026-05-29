-- =====================================================================
-- FASE 1 · Migración 03/09 — Tabla tariff_documents
-- =====================================================================
-- Registro de cada documento (PDF/Excel/email) recibido como origen de
-- una tarifa. Make → tariffs-ingest crea la fila en estado 'received'.
-- Tras extracción IA: 'extracted'. Tras validación humana: 'validated'
-- o 'rejected'.
-- =====================================================================

create table if not exists public.tariff_documents (
  id              uuid primary key default gen_random_uuid(),
  source          text not null
    check (source in ('gmail_make','manual_upload','retailer_crm')),
  email_id        text,
  sender_email    text,
  subject         text,
  received_at     timestamptz default now(),
  drive_file_id   text,
  drive_url       text,
  file_name       text,
  mime_type       text,
  file_size_bytes bigint,
  sha256          text unique,
  status          text not null default 'received'
    check (status in (
      'received',
      'duplicate_exact',
      'pending_extraction',
      'extracted',
      'pending_validation',
      'validated',
      'rejected',
      'error'
    )),
  error_message text,
  notes         text,
  created_at    timestamptz default now() not null,
  updated_at    timestamptz default now() not null
);

-- FK pendiente desde comercializadora_ofertas.source_document_id
-- (la columna ya existe tras migración 01; aquí cerramos el FK).
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'fk_oferta_source_document'
  ) then
    alter table public.comercializadora_ofertas
      add constraint fk_oferta_source_document
      foreign key (source_document_id)
      references public.tariff_documents(id)
      on delete set null;
  end if;
end$$;

create index if not exists idx_tariff_documents_status
  on public.tariff_documents(status);

create index if not exists idx_tariff_documents_sha
  on public.tariff_documents(sha256);

create index if not exists idx_tariff_documents_sender
  on public.tariff_documents(sender_email);

create index if not exists idx_tariff_documents_received_at
  on public.tariff_documents(received_at desc);

-- RLS
alter table public.tariff_documents enable row level security;

drop policy if exists tariff_documents_all_approved on public.tariff_documents;
create policy tariff_documents_all_approved
  on public.tariff_documents
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
