---
title: Pestaña Renovaciones de la ficha de empresa
section: empresas
audience: todos
keywords: [renovaciones, ficha empresa, prioridad, vigente, historico, vencimiento, CUPS, rotacion]
related:
  - docs/help/renovaciones/gestionar-renovaciones.md
  - docs/help/empresas/pestana-contratos.md
---

# Pestaña Renovaciones de la ficha de empresa

## Qué es
Dentro de la ficha de una empresa, la pestaña **Renovaciones** muestra todas sus renovaciones con la prioridad oficial del pipeline (la misma que en `/renovaciones`), el estado de gestión, el CUPS con su badge Vigente/Histórico cuando hay rotación, la comercializadora y la fecha de vencimiento.

## Cómo acceder
`/empresas` → clic en una empresa → pestaña **Renovaciones**.

## Qué muestra

| Columna | Significado |
|---|---|
| Prioridad | Badge oficial del pipeline: Crítica (rojo), Alta (naranja), Media (azul), Baja (gris), OK (verde). |
| Estado | Fase de gestión: Detectada, Contactado, Oferta enviada, Negociación, Renovado, Perdido. |
| CUPS | Código del punto. Si un mismo CUPS tiene varias renovaciones (rotación de contratos), la más reciente lleva badge **Vigente** y las demás **Histórico**. |
| Vencimiento | Fecha de vencimiento del contrato. "—" si no tiene fecha (candidata a la bandeja "sin fecha"). |

Clic en una fila → abre el contrato asociado.

## Una sola fuente de prioridad
Desde julio 2026 la prioridad que ves aquí, en la cabecera de la ficha y en el detalle del contrato sale del mismo sitio (el pipeline de renovaciones). Si un contrato no tiene renovación registrada, su detalle muestra una prioridad *estimada* por días al vencimiento, marcada con la etiqueta "estimada".

## Si algo falla
- Si una renovación no aparece, comprueba en `/renovaciones` filtrando por la empresa.
- Si la prioridad de aquí y la del detalle del contrato no coinciden, el contrato puede tener más de una renovación abierta — revísalo en `/renovaciones`.
