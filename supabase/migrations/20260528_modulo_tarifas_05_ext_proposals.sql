-- =====================================================================
-- FASE 1 · Migración 05/09 — Extensión de proposals
-- =====================================================================
-- Añade campos para vincular la propuesta a empresa/contacto/comercial
-- y para el flujo de aprobación + envío.
--
-- NOTA: el campo `status` legacy se conserva sin tocar. El nuevo
-- `status_v2` se introduce para no chocar con datos existentes; en una
-- fase posterior de consolidación habrá que: (a) migrar datos legacy
-- → v2, (b) renombrar v2 → status, (c) eliminar el legacy. Crear tarea
-- explícita en docs/ESTADO.md cuando llegue su momento.
-- =====================================================================

alter table public.proposals
  add column if not exists empresa_id uuid references public.empresas(id);

alter table public.proposals
  add column if not exists contacto_id uuid references public.contactos(id);

alter table public.proposals
  add column if not exists comercial_id uuid references public.user_profiles(id);

alter table public.proposals
  add column if not exists approved_by uuid references public.user_profiles(id);

alter table public.proposals
  add column if not exists approved_at timestamptz;

alter table public.proposals
  add column if not exists sent_at timestamptz;

alter table public.proposals
  add column if not exists status_v2 text
    check (status_v2 in ('draft','pending_review','approved','sent','rejected'))
    default 'draft';

create index if not exists idx_proposals_status_v2
  on public.proposals(status_v2);

create index if not exists idx_proposals_empresa_id
  on public.proposals(empresa_id)
  where empresa_id is not null;

create index if not exists idx_proposals_comercial_id
  on public.proposals(comercial_id)
  where comercial_id is not null;

NOTIFY pgrst, 'reload schema';
