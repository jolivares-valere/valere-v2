---
title: Gestionar renovaciones de contratos
section: renovaciones
audience: comerciales
keywords: [renovación, vencimiento, renovar, contrato, continuar, prolongar, recambio]
related:
  - contratos/gestionar-contratos
  - oportunidades/crear-oportunidad
---

# Gestionar renovaciones

## Resumen rápido
Menú → **Renovaciones**. Verás la lista de contratos que vencen en los próximos 90 días con su semáforo. Click en una → abre el flujo para crear la oportunidad de renovación.

## Qué es una renovación

Es el proceso de **prolongar o sustituir** un contrato existente antes de su fecha fin para evitar que el cliente se pase a otra comercializadora o quede con una tarifa peor.

## Vista del listado

Muestra contratos en ventana de 0-90 días antes del vencimiento, ordenados por urgencia:

| Semáforo | Urgencia |
|---|---|
| 🔴 Rojo | Vence en menos de 30 días |
| 🟠 Naranja | Vence en 30-60 días |
| 🟡 Amarillo | Vence en 60-90 días |

Columnas: empresa, compañía actual, fecha fin, semáforo, comercial, estado renovación (pendiente / en curso / ganada / perdida).

El **nombre de la empresa es un enlace**: al pulsarlo se abre su ficha completa (con sus pestañas de Contratos, Renovaciones y Suministros), sin pasar por el buscador.

## Buscar y ordenar el listado

- **Cuadro de búsqueda** (arriba a la izquierda de los filtros): escribe 2-3 letras del nombre de la empresa, de la compañía o del nº de contrato y la lista se filtra al instante. No distingue mayúsculas ni tildes. El contador muestra "X registros (de Y)" mientras filtras.
- **Ordenar por columnas**: haz clic en cualquier encabezado (Empresa, Contrato, Vencimiento, Estado, Prioridad) para ordenar ascendente; segundo clic invierte a descendente. La flecha ▲/▼ indica la columna y sentido activos. Al ordenar por Vencimiento, las renovaciones **sin fecha** van siempre al final.
- El botón **Limpiar** borra a la vez la búsqueda, los filtros y el orden (vuelves a la vista por defecto).

## Tarjetas KPI clicables

Las cuatro tarjetas de arriba (Activas, Críticas, Renovadas, Perdidas) **filtran la lista al pulsarlas**: clic en «Críticas» y la lista muestra exactamente esas renovaciones (el número de la tarjeta y el contador de la lista coinciden). Segundo clic en la misma tarjeta quita el filtro. La tarjeta activa se marca con un borde oscuro. Se combinan con el resto de filtros — p.ej. tarjeta *Críticas* + chip *NEXUS* = «las críticas de NEXUS» en 2 clics. «Activas» significa en curso: toda renovación que aún no está renovada ni perdida (también en el desplegable de estado como «Activas (en curso)»).

## Filtros-chip y export a Excel

- **Prioridad** y **Comercializadora** se filtran con chips (botones redondos bajo el buscador): un clic activa, otro clic en el mismo chip lo quita. Se combinan entre sí y con el resto de filtros — p.ej. "críticas de NEXUS" = chip *Crítica* + chip *NEXUS*.
- **Mes de vencimiento** y **Estado** se eligen en los desplegables junto al buscador. El filtro de mes incluye también renovaciones ya vencidas de ese mes: nada desaparece por estar vencido.
- La combinación activa queda **en la dirección (URL)** de la página: puedes copiarla y compartirla, y quien la abra verá exactamente la misma vista.
- **Exportar Excel** descarga el conjunto FILTRADO completo (todas las filas que cumplen los filtros, en el orden visible), no solo lo que cabe en pantalla. El fichero .xlsx se abre directamente en Excel.

## Bandeja "sin fecha"

Tras la carga del libro de ventas, muchas renovaciones existen **sin fecha de vencimiento documentada**. No son errores: son contratos cuya fecha fin nadie tiene por escrito — los candidatos a estar rodando en renovación tácita.

- **Abrir la bandeja**: pulsa la tarjeta **«📥 Sin fecha»** (arriba, junto a las demás), o elige «📥 Sin fecha (bandeja)» en el desplegable de mes. Dentro, las filas se ordenan por prioridad: las críticas arriba.
- **Poner fecha**: en la columna Vencimiento de esas filas hay un **campo de fecha directo** (ámbar). Consigue la fecha real (factura del cliente o comercializadora), písala ahí y guarda: la renovación **sale de la bandeja y entra al pipeline**. Su prioridad se recalcula **sin degradar**: se conserva la más urgente entre la que ya tenía asignada (criterio de negocio) y la estimada por días hasta el vencimiento (≤15 crítica, ≤30 alta, ≤60 media, ≤90 baja) — poner fecha solo puede subir la urgencia, nunca bajarla.
- En la cabecera de la ficha de cada empresa, el chip de renovación muestra «· N sin fecha» en ámbar si tiene renovaciones en la bandeja.

## Selector de empresa con filtro (al crear/editar)

En el formulario de renovación, sobre el desplegable de Empresa hay un campo "Escribe para filtrar empresas…": tecleando parte del nombre, el desplegable se reduce a las coincidencias (ordenadas alfabéticamente).

## Flujo típico de renovación

### 1. Detectar el contrato a renovar

- El sistema lo destaca 90 días antes en el dashboard + sección Renovaciones + notificación al comercial.
- Desde ahí decides: hablar con el cliente, preparar propuesta, o dejarlo ir.

### 2. Crear oportunidad de renovación

Dos formas:

**Desde el listado de Renovaciones**:
1. Click en el contrato.
2. Botón **+ Crear oportunidad de renovación**.
3. El sistema prerrellena empresa, contacto firmante, valor estimado (basado en histórico).

**Desde el pipeline de Oportunidades**:
1. Menú → Oportunidades → **+ Nueva oportunidad**.
2. Rellenar campo **Contrato origen** con el contrato a renovar.
3. Tipo: elegir según vayáis a renovar (eléctrica/gas/dual).
4. Nombre sugerido: "Renovación 2026 - [Empresa]".

### 3. Avanzar la oportunidad en el kanban

Normal — las 8 etapas del pipeline (prospecto → auditoría consumo → oferta presentada → negociación → contrato firmado → activo → ganada/perdida).

### 4. Resultado

- **Ganada**: se crea el nuevo contrato. El contrato viejo pasa a `baja` (si el cliente se cambia) o se deja vencer.
- **Perdida**: anotar motivo. El contrato viejo se deja vencer. Cliente perdido.

## Estrategias según urgencia

### 🟡 Amarillo (60-90 días)
- Llamada de tanteo al cliente.
- Revisar consumos + precios actuales.
- Preparar comparativa interna (no enviar aún).

### 🟠 Naranja (30-60 días)
- Presentar oferta formal.
- Negociar.
- Primera llamada firma.

### 🔴 Rojo (<30 días)
- **Urgencia máxima**: decidir si reactivar o dejar ir.
- Si hay interés del cliente: push fuerte para firma en <15 días.
- Si no responde o no cierra: activar "modo fallback" — ofrecer condición puente de 1 año para no perderlo.

## Renovación automática (si compañía actual la gestiona)

Algunos contratos se renuevan automáticamente por la comercializadora si el cliente no actúa. Registrar:

1. Si lo detectas en factura (nuevo precio aparece sin que hayas firmado nada): registrar en el CRM cambiando la `fecha_fin` del contrato existente a la nueva fecha.
2. Crear una actividad "renovación automática - revisar si conviene".
3. Si el nuevo precio NO conviene: buscar mejor oferta + gestionar cambio.

## Métricas (dashboard)

El dashboard muestra:
- **Tasa de renovación mensual**: % de contratos que vencen y se renuevan.
- **Churn**: % de contratos que se pierden (cliente se va).
- **Valor renovado**: € de contratos renovados este año.

Objetivo típico: tasa de renovación >80%.

## Errores frecuentes

- **"No aparece el contrato en Renovaciones"**: revisar si la `fecha_fin` está rellena en el contrato. Sin fecha fin, el sistema no sabe cuándo vence.
- **"La oportunidad no se vincula al contrato origen"**: al crear la oportunidad, asegurarse de rellenar el campo "Contrato origen" del desplegable.

## Preguntas relacionadas

- ¿Cómo ver los contratos que vencen este mes?
- ¿Puedo automatizar que se cree una oportunidad cuando un contrato vence a 60 días?
- ¿Cómo sé el motivo por el que un cliente no renovó?
- ¿Puedo exportar el listado de renovaciones a Excel?
