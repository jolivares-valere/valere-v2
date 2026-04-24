---
title: Pipeline de oportunidades (vista kanban)
section: oportunidades
audience: comerciales
keywords: [kanban, pipeline, etapas, arrastrar, oportunidades, embudo, probabilidad, mover]
related:
  - oportunidades/crear-oportunidad
  - oportunidades/automatizaciones
  - contratos/crear-contrato
---

# Pipeline de oportunidades (vista kanban)

## Resumen rápido
En **Oportunidades** verás un kanban con columnas = etapas del embudo comercial. **Arrastra** las tarjetas de columna en columna para cambiar la etapa según avance la negociación.

## Las 8 etapas del pipeline

| Etapa | Probabilidad | Significado |
|---|---|---|
| **Prospecto** | 10% | Primer contacto, aún sin confirmar interés real. |
| **Auditoría consumo** | 25% | Se ha solicitado/recibido la factura para analizar. |
| **Oferta presentada** | 50% | Se le ha enviado al cliente una oferta concreta. |
| **Negociación** | 70% | El cliente está negociando condiciones (precio, duración, etc.). |
| **Contrato firmado** | 90% | El contrato está firmado, pendiente de activación por la comercializadora. |
| **Activo** | 100% | El contrato está activo generando facturación. |
| **Ganada** | 100% | Oportunidad cerrada con éxito (terminal). |
| **Perdida** | 0% | Oportunidad cerrada sin éxito (terminal). |

La probabilidad es automática según la etapa. Se usa para calcular el forecast comercial.

## Paso a paso

### Ver el pipeline
1. En el menú, pulsa **Oportunidades**.
2. Verás el kanban con las 8 columnas. Cada tarjeta es una oportunidad.
3. Cada tarjeta muestra: nombre, empresa, valor estimado (€), ahorro anual estimado, fecha de cierre prevista.

### Mover una oportunidad de etapa
1. **Arrastra** la tarjeta desde su columna actual hasta la nueva etapa.
2. Suelta. El sistema actualiza la etapa automáticamente.
3. Si mueves a **Ganada**, el sistema automáticamente crea un borrador de contrato (automatización).
4. Si mueves a **Perdida**, te pedirá el **motivo de pérdida** (para estadísticas).

### Crear una oportunidad nueva
1. Pulsa **+ Nueva oportunidad** arriba a la derecha.
2. Rellena:
   - **Nombre** *(obligatorio)*: nombre descriptivo ("Cambio tarifa Mercadona Sevilla", por ejemplo).
   - **Empresa** *(obligatorio)*: elige entre las ya dadas de alta.
   - **Contacto**: persona de la empresa con la que negocias.
   - **Tipo**: electricidad, gas, dual.
   - **Etapa**: arranca en "Prospecto" por defecto.
   - **Valor estimado (€)**: cifra total del contrato.
   - **Ahorro anual estimado (€)**: cuánto ahorra el cliente.
   - **Fecha de cierre prevista**: cuándo esperas cerrar.
3. **Guardar**.

### Filtrar el kanban
- **Por comercial**: si eres manager o admin, puedes ver solo las oportunidades de un comercial concreto.
- **Por empresa**: filtro por nombre.
- **Por tipo**: eléctrica / gas / dual.

## Consejos

- **Actualiza las etapas frecuentemente**: el kanban refleja el estado real solo si los comerciales arrastran las tarjetas cuando avanzan. Si una oportunidad se queda "congelada" en una etapa durante semanas, probablemente haya que revisarla.
- **Añade actividades** a cada oportunidad para trazar el historial: llamadas, reuniones, envío de propuesta, respuesta del cliente. Desde la ficha de la oportunidad hay una pestaña **Actividades**.
- **Valor estimado vs ahorro anual**: no son lo mismo. El valor estimado es el tamaño del contrato total (kWh × precio × duración), el ahorro anual es cuánto se ahorra respecto al contrato previo.

## Automatizaciones activas

El sistema dispara estas automatizaciones según la etapa:

- **Mover a "Ganada"** → crea automáticamente un borrador de contrato asociado a la empresa y al comercial.
- **Contrato activado** (etapa activo) → crea automáticamente una tarea de seguimiento a 30 días.

## Errores frecuentes

- **"No puedes mover esta oportunidad"**: normalmente significa que no eres el comercial asignado y no tienes permisos de manager/admin. Pide al manager que la mueva o te la asigne.
- **"Motivo de pérdida obligatorio"**: al mover a "Perdida", el sistema exige un motivo para poder estadísticas.
- **La tarjeta no se mueve al arrastrarla**: problema de navegador — refresca la página (F5) y prueba de nuevo. Chrome recomendado.

## Preguntas relacionadas

- ¿Cómo crear una oportunidad asociada a un contrato que está por vencer?
- ¿Qué pasa cuando muevo una oportunidad a "Ganada"?
- ¿Puedo cambiar las probabilidades de cada etapa?
- ¿Cómo veo el forecast de ventas mensual?
- ¿Cómo añadir campos personalizados a las oportunidades?
