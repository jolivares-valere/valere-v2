---
title: Gestionar contratos (vencimientos, estados, renovaciones)
section: contratos
audience: todos
keywords: [contratos, vencimiento, estado, renovar, baja, cancelar, editar, alertas, semáforo]
related:
  - contratos/crear-contrato
  - renovaciones/gestionar-renovaciones
  - incidencias/registrar-incidencia
---

# Gestionar contratos

## Resumen rápido
Menú → **Contratos** para el listado completo. Click en un contrato → abre la ficha con todos los detalles. Desde allí: editar, cambiar estado, adjuntar docs, ver CUPS asociados.

## Vista de listado

El listado muestra todas las columnas principales: compañía, empresa, tipo energía, estado, fecha fin con semáforo.

### Semáforo de vencimiento

| Color | Días al vencimiento |
|---|---|
| 🟢 Verde | Más de 90 días |
| 🟡 Amarillo | Entre 60 y 90 días |
| 🟠 Naranja | Entre 30 y 60 días |
| 🔴 Rojo | Menos de 30 días o ya vencido |

Los **contratos firmados de clientes** en 🔴 y 🟠 aparecen también en el **Dashboard** como alertas y generan **notificaciones**.

Esto aplica únicamente a contratos del CRM cliente (empresas con relación firmada con Valere). Los vencimientos del contrato actual del prospecto (campo de captación) NO se muestran en el Dashboard ni generan notificaciones — solo se ven en las cards y el drawer de `/captacion`.

### Filtros del listado

- **Por estado**: trámite, activo, vencido, incidencia, baja, cancelado, borrador.
- **Por comercial**: filtrar por quién gestiona (solo manager/admin).
- **Por compañía**: Iberdrola, Endesa, Naturgy, etc.
- **Por tipo energía**: eléctrica, gas, dual.
- **Por vencimiento**: solo próximos 30 días / 60 días / 90 días.
- **Por empresa**: buscar por nombre de cliente.

### Acciones masivas (admin)

Marcando varios contratos con los checkboxes:

- Cambiar estado en lote (ej: todos los de trámite → activo tras una oleada de activaciones).
- Exportar selección a CSV.
- Asignar comercial en lote.

## Ficha del contrato

Al pulsar sobre un contrato se abre la ficha con pestañas:

1. **Datos** — todos los campos del contrato (editables).
2. **CUPS asociados** — suministros vinculados.
3. **Actividades** — llamadas, emails, notas.
4. **Documentos** — contratos firmados, autorizaciones, copias.
5. **Incidencias** — problemas ocurridos con este contrato.
6. **Renovación** — si procede.
7. **Campos personalizados** — custom fields si los hay.

## Cambiar el estado de un contrato

Los estados válidos y cuándo usarlos:

- **trámite**: firmado pero aún no activo (comercializadora procesando).
- **activo**: en servicio, facturando.
- **vencido**: pasada la fecha fin sin renovar. El sistema lo marca automáticamente 24h después de `fecha_fin`.
- **incidencia**: hay un problema sin resolver. Asociar incidencia en la pestaña correspondiente.
- **baja**: cliente dio de baja el contrato antes de fecha fin (por cambio a otra comercializadora, cese de actividad, etc.).
- **cancelado**: cancelado administrativamente (error en alta, problema legal, etc.).
- **borrador**: no firmado aún, preparándose.

Cambiar estado desde la ficha → **Editar** → campo **Estado** → **Guardar**. Queda registrado en el historial quién lo cambió y cuándo.

## Renovar un contrato

Cuando un contrato se acerca a la fecha fin:

1. Desde la ficha del contrato → pestaña **Renovación**.
2. **+ Nueva renovación**.
3. El sistema prerrellena los datos del contrato actual.
4. Ajustar condiciones (nuevo precio, nueva duración, nueva compañía).
5. **Guardar como borrador** — crea un nuevo contrato en estado `borrador`.
6. Cuando firme el cliente → cambiar el contrato nuevo a `trámite` y el antiguo a `baja` (o esperar que pase a `vencido` solo).

Alternativamente: desde **Oportunidades** → crear una oportunidad tipo "renovación" enlazada al contrato origen, y seguir el flujo comercial normal.

## Adjuntar el PDF del contrato firmado

1. Ficha del contrato → pestaña **Documentos**.
2. **+ Subir documento**.
3. Elegir archivo PDF.
4. Tipo: "Contrato firmado".
5. **Subir**.

El PDF queda asociado al contrato. Accesible desde la pestaña Documentos siempre que alguien abra la ficha.

## Errores frecuentes

- **"No puedo editar este contrato"**: no eres el comercial asignado y no tienes rol manager/admin. Pide a quien corresponda.
- **"El estado no puede cambiar directamente de X a Y"**: algunos cambios están restringidos. Por ejemplo: no puedes volver de `cancelado` a `activo` directamente — tienes que crear uno nuevo.
- **"El contrato aparece vencido pero yo acabo de renovarlo"**: cambia el estado manualmente a `activo` y actualiza la `fecha_fin`. El trigger automático de vencimiento se ejecuta cada 24h.

## Preguntas relacionadas

- ¿Cómo ver qué contratos vencen este mes?
- ¿Puedo exportar los contratos a Excel?
- ¿Cómo convierto un contrato en una incidencia?
- ¿Qué pasa cuando un contrato pasa a "vencido" automáticamente?
- ¿Puedo ver el historial de cambios de un contrato?
