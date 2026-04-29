# Gestión de Potencias — RDL 7/2026

La sección de Gestión de Potencias permite gestionar cambios de potencia eléctrica contratada aprovechando la ventana regulatoria del Real Decreto-Ley 7/2026, que permite modificaciones ilimitadas y sin coste hasta el 31 de diciembre de 2026.

## Acceso desde el menú

En la barra lateral izquierda, haz clic en **Gestión de Potencias** para desplegar el menú con todas las secciones. El menú se colapsa automáticamente cuando navegas a otras áreas del CRM.

## Dashboard de Potencias

La pantalla principal muestra:
- **Contador de días restantes** hasta el cierre de la ventana RDL 7/2026 (31/12/2026).
- **KPIs en tiempo real**: clientes activos, CUPS activos, expedientes abiertos y ciclos completados.
- **Alertas RDL**: expedientes que necesitan completarse con urgencia (URGENTE = 10 días o menos, ATENCIÓN = 15 días o menos, PREPARAR = 21 días o menos).
- **Bajadas aprobadas pendientes de subida**: expedientes que necesitan iniciar la segunda fase del proceso.
- **Distribución por estado**: resumen visual de cuántos expedientes están en cada fase.

## Expedientes

Un expediente representa el proceso completo de cambio de potencia para un cliente y un CUPS específico. Cada expediente puede contener uno o más ciclos.

### Crear un expediente nuevo

1. Ve a **Expedientes** en el menú de Potencias.
2. Haz clic en **Nuevo expediente**.
3. Selecciona la empresa y el CUPS correspondiente. Se mostrarán las potencias actuales del CUPS.
4. Introduce las nuevas potencias deseadas (P1, P2 y opcionalmente P3).
5. Haz clic en **Crear expediente**. Esto crea automáticamente el primer ciclo en estado "bajada pendiente" y la solicitud de bajada.

### Ver y gestionar un expediente

Haz clic en **Ver →** en cualquier expediente de la lista para acceder al detalle. Desde allí puedes:
- Ver el estado actual del ciclo con el indicador de progreso visual.
- Consultar las potencias actuales y las solicitadas (actual → nueva).
- Avanzar el estado del ciclo usando el botón de acción correspondiente.

### Filtros y búsqueda

Usa los filtros (Todos / Activos / Cancelados) y el buscador para localizar expedientes por nombre de empresa o código CUPS.

## Ciclos y estados

Cada expediente sigue este flujo de estados:

1. **Bajada pendiente**: El expediente está creado. Hay que enviar la solicitud de bajada a la distribuidora.
2. **Bajada activa**: La solicitud de bajada ha sido enviada. La distribuidora la está tramitando (plazo estimado: 20-21 días hábiles).
3. **Bajada aprobada**: La distribuidora ha aprobado la bajada de potencia. Hay que iniciar inmediatamente el proceso de subida.
4. **Subida pendiente**: Se va a enviar la solicitud de subida a la distribuidora.
5. **Subida activa**: La solicitud de subida ha sido enviada. La distribuidora la tramita.
6. **Completado**: El ciclo se ha completado. El cliente recupera su potencia original y se consigue el ahorro.

Para avanzar el estado, abre el expediente y haz clic en el botón de acción que aparece en la parte inferior de la tarjeta del ciclo.

## Notificaciones automáticas por email

Cada vez que se avanza el estado de un ciclo, el sistema envía automáticamente:
- Un email interno de notificación al equipo de Valere.
- Un email al cliente (cuando la bajada está activa, cuando se aprueba, cuando la subida está activa, y cuando el ciclo se completa).

Los emails se envían desde noreply@valereconsultores.com a través de Resend.

## Comunicaciones

La pantalla de Comunicaciones muestra todos los expedientes activos agrupados por la acción que requieren en ese momento. Las acciones urgentes (envío de solicitudes) aparecen primero. Es la vista operativa del día a día para el equipo de gestión.

## Informes

La pantalla de Informes muestra métricas agregadas: total de expedientes, distribución por estado, ahorro previsto vs. ahorro real conseguido, y ranking de clientes por número de expedientes.

## Documentación

La pantalla de Documentación es el repositorio de archivos vinculados a cada expediente. Para subir un documento:
1. Selecciona el expediente al que quieres vincularlo.
2. Elige el archivo desde tu ordenador.
3. El archivo se sube automáticamente y queda disponible para descarga.

## Configuración

La pantalla de Configuración muestra los parámetros del RDL 7/2026, el flujo estándar del proceso, información de las principales distribuidoras (plazos y contactos) y el estado de las notificaciones automáticas.

## Preguntas frecuentes

**¿Puedo tener varios ciclos en un expediente?**
Sí. Cuando un ciclo se completa, puedes iniciar un nuevo ciclo en el mismo expediente para realizar otro cambio de potencia dentro de la ventana RDL.

**¿Qué pasa si la distribuidora rechaza la solicitud?**
Por ahora, gestiona el rechazo manualmente en las notas internas del expediente. Puedes cancelar el expediente y crear uno nuevo si es necesario.

**¿Cuándo cierra la ventana del RDL 7/2026?**
El 31 de diciembre de 2026. El dashboard muestra siempre los días restantes en tiempo real.

**¿Qué distribuidoras gestionan estos cambios?**
Las principales son Endesa Distribución, Iberdrola Distribución, Naturgy/UFD, EDP Distribución y Repsol/CIDE, dependiendo de la zona geográfica del suministro.
