---
title: Estados y etapas de una oportunidad
section: oportunidades
audience: comerciales
keywords: [estados, etapa, fase, situación, status, oportunidad, embudo, pipeline, ganada, perdida, prospecto, propuesta enviada, negociación, contrato firmado, activo, motivo de pérdida]
related:
  - oportunidades/pipeline-kanban
  - oportunidades/crear-oportunidad
  - contratos/crear-contrato
---

# Estados y etapas de una oportunidad

> En el CRM **estado = etapa = fase** de una oportunidad. Son sinónimos. La columna del kanban en la que está la tarjeta indica su estado actual.

## Resumen rápido
Una oportunidad puede estar en uno de **8 estados**: Prospecto, Auditoría consumo, Oferta presentada, Negociación, Contrato firmado, Activo, Ganada o Perdida. Cada estado lleva asociada una probabilidad y un significado comercial.

## Los 8 estados posibles

| Estado | Probabilidad | Significado |
|---|---|---|
| **Prospecto** | 10% | Primer contacto, aún sin confirmar interés real. |
| **Auditoría consumo** | 25% | Se ha solicitado o recibido la factura para analizar. |
| **Oferta presentada** | 50% | Se ha enviado al cliente una oferta concreta. |
| **Negociación** | 70% | El cliente está negociando precio, duración u otras condiciones. |
| **Contrato firmado** | 90% | El contrato está firmado, pendiente de activación por la comercializadora. |
| **Activo** | 100% | El contrato está activo y generando facturación. |
| **Ganada** | 100% | Oportunidad cerrada con éxito (estado terminal). |
| **Perdida** | 0% | Oportunidad cerrada sin éxito (estado terminal). |

## Diferencia entre "Activo" y "Ganada"

- **Activo**: el contrato está vigente. Se sigue gestionando (renovaciones, incidencias, upsell).
- **Ganada**: estado final administrativo. Se usa cuando la oportunidad ya no requiere seguimiento comercial (por ejemplo, una venta puntual cerrada).

En la práctica, la mayoría de oportunidades pasan por **Activo** y allí se quedan; **Ganada** se usa para cerrar el embudo limpiamente.

## Cómo cambiar el estado

1. Ve a **Oportunidades** (kanban).
2. **Arrastra** la tarjeta de la oportunidad a la columna del nuevo estado.
3. Suelta. El estado se guarda automáticamente.

Si mueves a **Perdida**, el sistema te pedirá un **motivo de pérdida** (precio, condiciones, no responde, contrato con otro, etc.) que se usa para estadísticas.

Si mueves a **Ganada** o **Contrato firmado**, el sistema te ofrece crear un borrador de contrato con los datos de la oportunidad (automatización).

## Reglas y restricciones

- No puedes saltarte etapas hacia atrás sin justificación: si una oportunidad estaba en **Negociación** y la pasas a **Prospecto**, queda registrado en el historial.
- Una oportunidad **Perdida** puede reabrirse más tarde si el cliente vuelve a interesarse — se mueve manualmente fuera de Perdida.
- Una oportunidad **Ganada** o **Activo** no debería volver a fases tempranas; si el cliente cancela, es mejor crear una **incidencia** o una nueva oportunidad asociada.

## Estados terminales

Los estados terminales son **Ganada** y **Perdida**. Cuando una oportunidad llega a uno de ellos:

- Sale del forecast comercial activo.
- No genera tareas automáticas nuevas.
- Se mantiene en el histórico para informes (tasa de conversión por etapa, tiempo medio en cada estado, ratio ganadas/perdidas, etc.).

## Preguntas relacionadas

- ¿Cómo muevo una oportunidad de una etapa a otra?
- ¿Por qué la probabilidad cambia automáticamente?
- ¿Cómo veo el motivo por el que perdí una oportunidad?
- ¿Qué etapas cuentan en el forecast del mes?
