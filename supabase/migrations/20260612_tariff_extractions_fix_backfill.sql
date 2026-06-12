-- 2026-06-12 — Fixes destapados por el primer run real del pipeline tariffs-ingest-email
-- (YA APLICADAS en prod vía MCP durante el backfill Visalia; este fichero las registra en el repo)
--
-- Contexto: la EF tariffs-ingest-email escribe en tariff_extractions sin document_id
-- (flujo email, no PDF) y con status 'valid'/'invalid'. El schema heredado del flujo
-- PDF lo impedía.

-- 1. document_id y model_name opcionales (el flujo email no los rellena)
ALTER TABLE public.tariff_extractions ALTER COLUMN document_id DROP NOT NULL;
ALTER TABLE public.tariff_extractions ALTER COLUMN model_name DROP NOT NULL;

-- 2. status check ampliado con los valores que escribe la EF
ALTER TABLE public.tariff_extractions DROP CONSTRAINT IF EXISTS tariff_extractions_status_check;
ALTER TABLE public.tariff_extractions ADD CONSTRAINT tariff_extractions_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'validated'::text, 'rejected'::text, 'error'::text, 'valid'::text, 'invalid'::text]));

-- Nota relacionada (sin SQL): la EF usaba gemini-1.5-flash (modelo retirado, 404).
-- Corregido a gemini-2.5-flash en supabase/functions/tariffs-ingest-email/index.ts
-- y redeployada (v4, verify_jwt=false).
