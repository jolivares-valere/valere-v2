-- PR-3.3 (semana 3 CRM UTIL): documentos OCR-ready
-- Nota auditor+Juan (21-jul): no cerrar puertas al backlog v2 #1 "Alta desde documento"
-- (OCR pre-rellena el asistente PR-3.2 y estima comision con el catalogo PR-3.1).
-- (c) Acceso por Edge Function: service_role BYPASEA RLS -> los PDF del bucket
--     'documentos' ya son legibles por EF sin politica adicional. Documentado aqui.

-- (a) Metadatos por documento
alter table public.documentos
  add column if not exists tipo_documento text
    check (tipo_documento in ('contrato','factura','dni','otro')),
  add column if not exists comercializadora_id uuid references public.comercializadoras(id);
comment on column public.documentos.tipo_documento is 'Tipo documental (contrato/factura/dni/otro) — insumo del OCR de alta desde documento (backlog v2 #1).';
comment on column public.documentos.comercializadora_id is 'Comercializadora del documento si se conoce (FK catalogo PR-3.1) — permite estimar comision al vuelo.';
create index if not exists idx_documentos_tipo_documento on public.documentos(tipo_documento);
