---
title: Calendario interno de Captación
section: captacion
audience: telemarketing, master, asesor_senior
keywords: [calendario, agenda, llamadas, programar, reagendar, drag, arrastrar, vencimiento, evento, fecha, hora, semana, mes, día, planning, sincronizar, ficha, próxima llamada]
related:
  - captacion/crear-lead
  - captacion/vencimiento-y-semaforo
  - captacion/pedir-factura
  - actividades/configurar-recordatorio
---

# Calendario interno de Captación

## Qué es
Pestaña dentro de `/captacion` que muestra todas las llamadas programadas y los vencimientos de contrato del pipeline en un calendario visual. **No es un calendario separado**: lo que ves aquí son los mismos datos que están en la ficha de cada cliente. Si cambias algo aquí, la ficha se actualiza al instante, y al revés.

## Cómo acceder
Pestaña **"Calendario"** entre Histórico y Mis llamadas dentro de `/captacion`.

## Vistas disponibles
Botones arriba a la derecha:
- **Mes** — cuadrícula del mes. Visión panorámica.
- **Semana** (vista por defecto) — días en columnas, horas en filas. La más útil día a día.
- **Día** — sólo el día activo, vertical con franja horaria.
- **Agenda** — lista cronológica sin cuadrícula. Repaso rápido.

Botones **Hoy / Anterior / Siguiente** arriba a la izquierda para navegar.

## Tipos de eventos visibles

| Color | Significado | Origen |
|---|---|---|
| 🔵 Azul | Llamada programada | Campo `próxima llamada` de la ficha del cliente |
| 🌸 Rosa | Vencimiento contrato del prospecto | Campo `fecha vencimiento contrato` de la ficha |

La leyenda con estos dos colores aparece encima del calendario.

## Acciones que puedes hacer

### Reagendar una llamada
Arrastra el evento azul a otro día u hora. Toast verde "Llamada reagendada" y la ficha del cliente se actualiza inmediatamente.

> Los vencimientos de contrato (rosa) **no se reagendan desde el calendario**. Edítalos en la ficha del cliente.

### Editar una llamada (cambiar hora, añadir notas)
Click sobre el evento azul. Se abre modal **"Reagendar llamada"** con:
- Fecha y hora
- Motivo / notas (qué quieres recordar para esa llamada)
- Botón **"Cancelar llamada"** (rojo) para borrar el evento sin abrir el cliente
- Botón **"Guardar cambios"** para confirmar

El modal dice literal "Cambios sincronizan con la ficha de [nombre del cliente]".

### Programar una llamada nueva
Click en cualquier hueco vacío del calendario. Se abre modal **"Programar llamada"** con la fecha y hora pre-rellenadas según el hueco que pulsaste.

> **Limitación V1:** el modal desde un hueco vacío todavía NO permite elegir cliente. Para asociar la llamada a un cliente, programa la llamada **desde la card del cliente** (botón "Posponer llamada" del drawer). En cuanto lo guardes, aparecerá en el calendario en la fecha correspondiente.

### Cancelar una llamada
Abre el modal de edición (click en evento azul) → botón **"Cancelar llamada"** (rojo). Esto borra la próxima llamada de la ficha del cliente. No borra al cliente.

## Coordinación con la ficha del cliente (bidireccional)

El calendario es una **vista sobre las fichas de los clientes**, no un sistema aparte:

```
ficha del cliente (oportunidad)         calendario
────────────────────────────────        ─────────────
fecha próxima llamada            ◄────► evento azul
notas próxima llamada            ◄────► campo "motivo / notas"
fecha vencimiento contrato       ◄────► evento rosa (todo el día)
```

Esto significa:
- Si **reagendas en el calendario** → la card en "Por llamar" muestra la nueva fecha al instante.
- Si **editas próxima llamada desde la card** del cliente → el evento se mueve en el calendario.
- Si **pulsas "Posponer llamada"** desde el drawer → aparece como evento azul el día que pongas.
- Si **cancelas la llamada** en el calendario → la card vuelve a aparecer como pendiente sin fecha.

## Qué empresas se ven

| Tu rol | Qué eventos ves |
|---|---|
| Telemarketing (Carolina A) | Sólo las llamadas y vencimientos de tus casos |
| Analista (Carolina M) | Sólo los suyos |
| Asesor senior (Antonio) | Sólo los suyos |
| Master / admin | Todo el pipeline de Captación |

## Si algo falla
- **El calendario aparece vacío** — comprueba si tienes leads con fecha de próxima llamada o vencimiento. Si todos los leads están sin fecha, el calendario estará vacío (normal).
- **No se reagenda al arrastrar** — toast rojo "No se pudo reagendar" → revisa conexión. Si el evento es rosa (vencimiento) no se reagenda desde aquí, edítalo en la ficha.
- **Modal "Programar llamada" pide cliente** — limitación V1. Programa desde la card del cliente como workaround.

## Próximas mejoras (no disponibles aún)
- Sincronización con Google Calendar y Outlook (en roadmap, requiere setup OAuth).
- Selector de cliente al programar llamada desde hueco vacío.
