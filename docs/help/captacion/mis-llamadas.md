---
title: Mis llamadas — log cronológico
section: captacion
audience: telemarketing, master, asesor_senior
keywords: [llamadas, log, historial, registrar, resultado, contestó, sin respuesta, no contesta, pospuesta, stats, excel, exportar, equipo]
related:
  - actividades/registrar-actividad
  - captacion/calendario
  - actividades/configurar-recordatorio
---

# Mis llamadas — log cronológico

## Qué es
Pestaña dentro de `/captacion` que muestra todas las llamadas que has hecho (registradas como actividades tipo "llamada") en orden cronológico. Útil para repaso, KPIs personales y reporting.

## Cómo acceder
Pestaña **"Mis llamadas"** (la última, a la derecha de Calendario) dentro de `/captacion`.

## Qué ves

### Stats arriba (3 cards)
- **Total llamadas** — cuántas en el rango seleccionado.
- **Contestadas** (verde) — cuántas resultaron en conversación.
- **Sin respuesta** (rojo) — cuántas no contestaron.

### Filtros
- **Rango fechas** — últimos 7 / 30 (default) / 90 días / último año.
- **Resultado** — todos / contestó / sin respuesta / negativo / neutral / pospuesto.
- **Solo mías** (checkbox marcado por defecto) — desmárcalo para ver las del equipo.
- **Buscador** — texto libre por nombre de empresa o NIF.
- **Botón Excel** — exporta a .xlsx las llamadas filtradas.

### Tabla
| Columna | Contenido |
|---|---|
| Cuando | Fecha + hora |
| Empresa | Nombre + NIF |
| Teléfono | Número marcado |
| Resultado | Icono color + texto: ✓ Contestó / ✗ No contesta / ⚠ Negativo / ↺ Pospuesta |
| Notas | Resumen del comentario que escribiste al registrar |

Click en cualquier fila → abre el drawer del cliente correspondiente.

## Cómo se llenan las llamadas
Las llamadas aparecen aquí cuando se registran desde la **ficha del cliente** (botón "Registrar llamada" o similar dentro del drawer). Esta pestaña es **sólo lectura** del log.

Si tu rol no es telemarketing, es normal ver el listado vacío — tú no haces llamadas directamente.

## Reglas por rol

| Rol | Qué ves por defecto |
|---|---|
| Telemarketing (Carolina A) | Tus llamadas |
| Master / admin | Tus llamadas. Desmarca "Solo mías" para ver las de todo el equipo |
| Analista, asesor senior | Tus llamadas (probablemente vacío si no llamas) |

## Si está vacío
- Verifica que "Solo mías" no esté marcado si esperas ver llamadas del equipo.
- Cambia el rango a "Último año".
- Cambia el filtro "Resultado" a "Todos".
- Si sigue vacío, no hay llamadas registradas en ese período.

## Exportar a Excel
Botón **Excel** arriba a la derecha de los filtros (con icono ⤓). Genera un archivo `mis_llamadas_YYYY-MM-DD.xlsx` con las columnas: Fecha, Empresa, NIF, Teléfono, Resultado, Duración (min), Notas, Por (quién registró la llamada).

Útil para:
- Reporting mensual a Juan.
- Análisis externo de ratios de conversión.
- Backup personal.

## Si algo falla
- **"No descarga el Excel"** — comprueba bloqueo de descargas en el navegador.
- **Botón Excel desactivado (gris)** — significa que no hay llamadas filtradas; cambia filtros.
- **"Tabla en blanco con stats a 0"** — no hay llamadas en ese rango. Amplía rango o desmarca "Solo mías".
