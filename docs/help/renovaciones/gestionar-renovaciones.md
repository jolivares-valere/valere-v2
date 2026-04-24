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
