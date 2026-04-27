---
title: Cerrar una oportunidad (ganada, perdida, motivos, reabrir)
section: oportunidades
audience: comerciales
keywords: [cerrar, ganar, ganada, perder, perdida, motivo de pérdida, motivos, reabrir, reactivar, terminal, finalizar, cerrar oportunidad, won, lost, perder cliente, ganar cliente]
related:
  - oportunidades/pipeline-kanban
  - oportunidades/estados-y-etapas
  - oportunidades/crear-oportunidad
  - contratos/crear-contrato
---

# Cerrar una oportunidad

## Resumen rápido
Una oportunidad se cierra moviéndola a **Ganada** o **Perdida** en el kanban. Si es Ganada, el sistema crea automáticamente un borrador de contrato. Si es Perdida, te pide el **motivo de pérdida** para estadísticas. Una oportunidad cerrada se puede **reabrir** moviéndola fuera del estado terminal.

## Cerrar como Ganada

Significa: **el cliente acepta y se va a firmar contrato** (o ya está firmado).

### Pasos
1. Menú → **Oportunidades** (vista kanban).
2. Localiza la tarjeta.
3. **Arrastra** la tarjeta a la columna **Ganada**.
4. (Opcional) El sistema te ofrece marcar también el motivo o nota de cierre.
5. El sistema dispara la **automatización**: crea un borrador de contrato asociado a la empresa y comercial.

### Qué pasa después
- La oportunidad sale del **forecast activo** (ya está cerrada).
- Aparece en el **histórico** y en informes (tasa de ganadas, tiempo medio en cada etapa).
- Si tu rol es comercial, suma a tu **comisión** según las reglas internas.

> **Activo vs Ganada**: si el contrato sigue gestionándose (renovaciones, incidencias futuras), es habitual dejar la oportunidad en **Activo** en vez de Ganada. Ver `oportunidades/estados-y-etapas.md`.

## Cerrar como Perdida

Significa: **el cliente no firma** (eligió otra comercializadora, no responde, descartó, etc.).

### Pasos
1. Arrastra la tarjeta a la columna **Perdida**.
2. **Aparece un diálogo obligatorio** pidiendo el motivo de pérdida.
3. Elige una de las opciones predefinidas:
   - **Precio** — el cliente se fue por precio mejor.
   - **Condiciones del contrato** — duración, penalizaciones, indexación.
   - **No responde** — silencio del cliente tras N intentos.
   - **Eligió competencia** — fue con otra consultora/comercial.
   - **Cliente decidió no cambiar** — se quedó con lo que tenía.
   - **No es cliente potencial** — descartado por solvencia, fit, etc.
   - **Otro** (especificar): texto libre.
4. (Opcional) Añade una **nota** con detalle (ej. nombre del competidor, precio que ofrecieron).
5. **Confirmar**.

### Por qué es importante el motivo de pérdida
- Permite al manager ver **por qué se pierden las oportunidades** (insights estratégicos).
- Si muchas se pierden por precio → revisar la política de pricing.
- Si muchas se pierden por "no responde" → revisar el seguimiento comercial.
- Si una comercializadora competidora sale mucho → ajustar argumentario.

> Sin motivo, no se puede mover a Perdida. Es una **regla dura del CRM**.

## Reabrir una oportunidad cerrada

Casos típicos:
- Cliente que dijo "no" hace 6 meses y vuelve interesado.
- Oportunidad marcada Perdida por error.
- Renegociación tras un fallo de la comercializadora elegida por el cliente.

### Pasos
1. Menú → **Oportunidades** → cambia el filtro a **Estado: Perdida** (o **Ganada**).
2. Encuentra la oportunidad.
3. **Arrastra** la tarjeta a una etapa intermedia (Negociación, Auditoría consumo, etc.).
4. Confirma la reapertura.
5. El sistema registra en el historial la reapertura con fecha y usuario.

### Buena práctica al reabrir
- Si el contexto ha cambiado mucho (cambio de tarifa del cliente, nueva oferta, etc.), considera **crear una nueva oportunidad** en lugar de reabrir la antigua. La trazabilidad es más limpia.
- Si la oportunidad reabierta es ganada finalmente, los KPIs históricos se ajustan: la conversión se cuenta en el momento del cierre final, no del primer cierre.

## Cerrar masivamente varias oportunidades

Si necesitas cerrar varias oportunidades a la vez (ej. limpieza de fin de trimestre):

1. Vista de **listado** de oportunidades (no kanban).
2. Filtra las que quieres cerrar.
3. Selecciona con los checkboxes (o **Seleccionar todas**).
4. Botón **Acciones masivas** → **Cerrar como Perdida** o **Cerrar como Ganada**.
5. Si es Perdida, el sistema te pide un único motivo aplicado a todas.
6. **Confirmar**.

> Solo manager y admin pueden hacer cierres masivos.

## Estadísticas que dependen del cierre

El motivo de pérdida y el cierre alimentan estos informes:
- **Tasa de conversión** por comercial / por mes / por etapa.
- **Tiempo medio en cada etapa** (cuánto tarda en moverse de Negociación a Ganada).
- **Análisis de pérdidas**: tarta por motivo, evolución mensual.
- **Forecast vs realidad**: cuántas oportunidades activas se ganan realmente, ajusta la probabilidad de etapas.

Ver `informes/generar-informes.md` para los reports concretos.

## Errores frecuentes

- **"Motivo de pérdida obligatorio"**: rellena el campo motivo, no se puede saltar.
- **"No tienes permiso para cerrar esta oportunidad"**: no eres el comercial asignado ni manager. Pide al manager.
- **"Esta oportunidad ya está cerrada"**: alguien la cerró antes que tú (concurrencia). Refresca la página.
- **"No se crea el borrador de contrato"**: comprueba que la empresa asociada existe. Si la borraste recientemente, recréala o asocia la oportunidad a otra.

## Preguntas relacionadas

- ¿Cómo veo todas las oportunidades perdidas del último trimestre?
- ¿Puedo cambiar el motivo de pérdida después de cerrar?
- ¿La automatización de "crear contrato" se puede desactivar?
- ¿Las oportunidades reabiertas cuentan en el forecast actual?
