-- Fix: cups.contrato_id → nullable
-- Necesario para migrar supply_points que no tienen contrato asociado (FASE 20.7.c).
ALTER TABLE public.cups ALTER COLUMN contrato_id DROP NOT NULL;
