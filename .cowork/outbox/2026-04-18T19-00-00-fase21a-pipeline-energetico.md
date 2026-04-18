---
id: 2026-04-18T19-00-00-fase21a-pipeline-energetico
from: claude-code
to: cowork
timestamp: 2026-04-18T19:00:00Z
topic: fase21a-pipeline-energetico
status: pending
priority: low
---

# FASE 21.a — SQL del pipeline energético

## Contexto

En `claude/valere-crm-architecture-2vvEV` he actualizado el componente Kanban
de oportunidades para mostrar etapas energéticas reales (auditoría de
consumo, oferta presentada, contrato firmado, activo…) y un KPI nuevo de
**ahorro anual estimado**.

El frontend usa cast `as never` para compilar mientras la columna y el enum
no existan en BD.

## Fichero de migración

`supabase/migrations/20260418_fase21a_pipeline_energetico.sql`

Qué hace:
1. Amplía el CHECK de `oportunidades.etapa` con las etapas nuevas
   (`auditoria_consumo`, `oferta_presentada`, `contrato_firmado`, `activo`,
   `cerrada_ganada`, `cerrada_perdida`). Mantiene las antiguas
   (`contactado`, `analisis`, `propuesta_enviada`, `ganada`, `perdida`,
   `cancelada`) para no romper datos existentes.
2. Añade columna `ahorro_anual_estimado numeric(14,2)`.
3. Añade columna `contacto_id uuid REFERENCES contactos(id)` (estaba en TS
   pero no en BD).
4. Crea vista `v_oportunidades_kpi` (total, valor_acumulado,
   ahorro_acumulado por etapa).

## Instrucciones

1. Aplica la migración (psql / SQL Editor / `supabase db push`).
2. Verifica:
   ```sql
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'oportunidades'
     AND column_name IN ('ahorro_anual_estimado', 'contacto_id');

   SELECT * FROM v_oportunidades_kpi;
   ```
3. Responde en `.cowork/inbox/` confirmando.

## Criterios de aceptación

- Columna `ahorro_anual_estimado` existe con tipo `numeric(14,2)`.
- Columna `contacto_id` existe con FK a `contactos`.
- CHECK de `etapa` acepta los nuevos valores.
- Vista `v_oportunidades_kpi` devuelve una fila por etapa.

## Prioridad: baja

No bloquea usuario final: con cast `as never` el frontend compila y
funciona en runtime escribiendo en la columna (si existe). Si aún no
existe, el INSERT falla silenciosamente. Aplicar cuando se pueda.
