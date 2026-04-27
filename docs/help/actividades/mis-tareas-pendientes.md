---
title: Ver mis tareas pendientes y mi día
section: actividades
audience: todos
keywords: [tareas, pendientes, mi dia, mis tareas, hoy, vencidas, atrasadas, to-do, todo, agenda, lista, checklist, prioridad, urgente]
related:
  - actividades/registrar-actividad
  - actividades/configurar-recordatorio
  - calendario/ver-agenda
  - dashboard/interpretar-dashboard
---

# Mis tareas pendientes y mi día

## Resumen rápido
Tres sitios para ver tus pendientes:
- **Dashboard** → bloque "Mis tareas" con las próximas y vencidas.
- **Calendario** → vista diaria/semanal con todas las actividades programadas.
- **Actividades** (en menú) → listado completo filtrado por "Asignado a mí" + "Pendiente".

## Mi día — flujo recomendado al empezar la jornada

1. Abre el CRM (Dashboard es la primera pantalla).
2. Bloque **Mis tareas** arriba: prioriza las **rojas** (vencidas) primero.
3. Click en cada tarea → ver descripción, contexto, completar o reprogramar.
4. Bloque **Vencimientos próximos** (contratos a 30/60/90 días): si hay rojos, contacta al cliente hoy.
5. Bloque **Oportunidades estancadas**: revisa si alguna lleva 14+ días sin moverse en el pipeline.
6. Calendario: ver reuniones programadas hoy.

## Vista de listado completa

1. Menú lateral → **Actividades**.
2. Filtros recomendados:
   - **Asignado a**: yo (preseleccionado).
   - **Estado**: pendiente.
   - **Tipo**: tarea (si solo quieres ver to-dos, no llamadas/reuniones).
   - **Vencimiento**: hoy / esta semana / vencidas / sin filtro.
3. Ordena por **prioridad** (urgente, alta, media, baja) o por **fecha de vencimiento** (las más cercanas arriba).

## Estados de una tarea

| Estado | Significado |
|---|---|
| **Pendiente** | Aún por hacer. Aparece en dashboard y calendario. |
| **En curso** | Empezada, no terminada. Útil para tareas largas. |
| **Realizada** | Completada. Sale de pendientes pero queda en histórico. |
| **Cancelada** | Ya no se hará (cliente desistió, prioridad cambió). |

## Marcar una tarea como completada

### Desde el dashboard
1. Click en el checkbox al lado de la tarea en "Mis tareas".
2. Pasa a **Realizada** automáticamente.

### Desde la ficha de la tarea
1. Abrir la tarea.
2. Botón **Marcar como realizada** o cambiar estado a "Realizada".
3. (Opcional) Añadir un **resultado** o nota: "Cliente confirma reunión jueves", "No responde, reintentar".
4. **Guardar**.

> **Resultado vs descripción**: la descripción es lo que vas a hacer (futuro), el resultado es lo que pasó (pasado). Rellena ambos cuando completes.

## Reprogramar una tarea

Si no puedes hoy:
1. Abre la tarea.
2. Cambia **Fecha vencimiento** a la nueva fecha.
3. **Guardar**.

Aparece en la nueva fecha. La fecha original queda en el historial (sabes que se reprogramó).

## Tareas vencidas — qué hacer

Las tareas vencidas (fecha pasada y estado pendiente) aparecen en **rojo** en el dashboard.

Opciones:
- **Completarla ya y marcarla como realizada** con la fecha de hoy.
- **Reprogramarla** a una fecha realista.
- **Cancelarla** si ya no aplica (cambio de plan, cliente cerró antes).

⚠️ Una tarea vencida sin tocar genera una **alerta semanal al manager** ("X tareas vencidas pendientes"). Mejor reprogramar o cancelar que dejar acumular.

## Asignar tarea a otro compañero

Solo manager y admin pueden asignar tareas a otros usuarios.

1. Crear o editar la tarea.
2. Campo **Asignado a** → elige otro usuario del desplegable.
3. **Guardar**.
4. El usuario recibe notificación in-app y email (si tiene activadas).

## Tareas recurrentes

Actualmente el CRM **no soporta tareas recurrentes nativas** (ej. "todos los lunes a las 9"). Workarounds:

- Crear varias tareas a futuro de golpe (ej. una para cada lunes del mes).
- Usar el **Calendario** con eventos recurrentes (eventos sí soportan recurrencia diaria/semanal/mensual).

## Notificaciones de tareas

Si las tienes activadas en perfil (ver `perfil/configurar-mi-cuenta.md`):
- **Email diario** con tus tareas vencidas y las del día.
- **Notificación in-app** (campana) cuando alguien te asigna una tarea nueva.
- **Email** 1 día antes de cada vencimiento.

## Filtros útiles guardados

Vistas que te recomendamos guardar como favoritas:
- **Hoy**: vencen hoy + sin fecha (TODO genérico).
- **Esta semana**: vencen en los próximos 7 días.
- **Vencidas**: hace falta limpiarlas.
- **Sin asignar**: tareas creadas pero sin owner (solo manager).
- **Alta prioridad pendientes**: prioridad alta o urgente, pendientes.

## Errores frecuentes

- **"No veo el bloque Mis tareas en el dashboard"**: el filtro de fechas global del dashboard puede estar excluyéndolas. Cambia el rango a "este mes" o "siempre".
- **"Marqué como realizada pero sigue apareciendo"**: refresca la página (F5). Cache del navegador.
- **"No puedo asignar a otro"**: solo manager/admin. Pide al manager.
- **"Las notificaciones de tareas no me llegan"**: revisa Mi perfil → Notificaciones que están activadas + email correcto + carpeta spam.

## Preguntas relacionadas

- ¿Cómo creo una tarea para mañana?
- ¿Hay una vista tipo Kanban (To Do / Doing / Done) para mis tareas?
- ¿Puedo exportar mis tareas completadas del mes a Excel?
- ¿Cómo silencio temporalmente las notificaciones de tareas?
