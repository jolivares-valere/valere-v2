---
title: Pestaña Contratos de la ficha de empresa
section: empresas
audience: todos
keywords: [contratos, ficha empresa, CUPS, comercializadora, estado contrato, fechas contrato, detalle contrato]
related:
  - docs/help/empresas/cabecera-ficha-empresa.md
---

# Pestaña Contratos de la ficha de empresa

## Qué es
Dentro de la ficha de una empresa, la pestaña **Contratos** muestra todos sus contratos en una tabla: comercializadora, código CUPS, estado en color, fecha de inicio y fecha de fin.

## Cómo acceder
`/empresas` → clic en una empresa → pestaña **Contratos**.

## Acciones

| Acción | Cómo |
|---|---|
| Ver el detalle de un contrato | Clic en cualquier fila → se abre la página del contrato. |
| Identificar el estado | Badge de color: verde = activo, azul = trámite, rojo = vencido, ámbar = incidencia, gris = baja/borrador/cancelado (tachado). |
| Ver el CUPS del contrato | Columna CUPS (en fuente monoespaciada). "—" si el contrato no tiene CUPS enlazado. |

## Coordinación con otros tabs/módulos
- El número de "contratos activos" de la cabecera de la ficha sale de estos mismos contratos (solo los de estado activo).
- Los CUPS también se ven con más detalle (Datadis, tarifas, potencias) en la pestaña ⚡ Suministros.
- Contratos sin fecha de fin muestran "—": son candidatos a la bandeja de renovaciones sin fecha.

## Si algo falla
- Si la tabla queda vacía y la empresa debería tener contratos, comprueba en `/contratos` filtrando por la empresa; si ahí sí aparecen, avisa a soporte.
- Si un CUPS sale "—", el contrato no tiene CUPS enlazado — se puede corregir desde el detalle del contrato.
