-- =====================================================================
-- FASE 1 · Migración 02/09 — Extensión de comercializadoras
-- =====================================================================
-- Añade: logo_url (para mostrar en propuestas), web, email_contacto,
-- agente_referencia (datos comerciales del contacto Valere).
-- =====================================================================

alter table public.comercializadoras
  add column if not exists logo_url text;

alter table public.comercializadoras
  add column if not exists web text;

alter table public.comercializadoras
  add column if not exists email_contacto text;

alter table public.comercializadoras
  add column if not exists agente_referencia text;

NOTIFY pgrst, 'reload schema';
