---
title: Vista Fichas y Vista Tabla
section: captacion
audience: telemarketing, master, asesor_senior
keywords: [vista, fichas, tabla, excel, columnas, ordenar, sort, edición inline, filtros, buscador, exportar, xlsx, paginación]
related:
  - captacion/crear-lead
  - captacion/calendario
  - captacion/mis-llamadas
---

# Vista Fichas y Vista Tabla

## Qué es
En `/captacion` hay un **selector de Vista** (arriba a la derecha, junto al botón "+ Nuevo lead"). Permite cambiar cómo se muestran las empresas dentro de cada pestaña:
- **Fichas** (vista por defecto) — cuadrícula de tarjetas con avatar y datos resumidos.
- **Tabla** — tabla tipo Excel con columnas ordenables, edición inline y export.

Tu elección se recuerda entre sesiones (se guarda en el navegador).

## Cuándo usar Fichas
- Trabajo del día a día (Carolina A llamando).
- Pocas empresas a la vista.
- Lectura rápida con avatar y semáforo de vencimiento muy visible.

## Cuándo usar Tabla
- Cuando quieras ver muchas empresas a la vez (>20).
- Para ordenar por columna (alfabético, por vencimiento, por última actividad).
- Para editar datos rápidamente sin abrir la ficha (edición inline).
- Para exportar a Excel.

## Cómo cambiar entre vistas
Click en el botón **"Vista: Fichas"** o **"Vista: Tabla"** arriba a la derecha. Desplegable con las dos opciones.

## Vista Tabla — funcionalidades

### Columnas
- Empresa (nombre + NIF)
- Teléfono (editable inline)
- Estado (etapa operativa)
- Responsable actual
- Vence (semáforo de vencimiento contrato)
- Origen (editable inline)
- Valor estimado (€, editable inline)
- Última actividad

### Ordenar
Click en la cabecera de la columna con ▼ junto al nombre. Click otra vez para invertir.

### Edición inline (sin abrir la ficha)
**Doble click** en cualquier celda editable:
- Teléfono empresa
- Origen
- Valor estimado (€)

El input aparece en la propia celda. **Enter** para guardar, **Esc** para cancelar. Toast verde "Guardado" o rojo "Error" con detalle.

Los cambios se propagan a TODAS las pantallas: ficha del cliente, otras pestañas, vista Fichas. **Es la misma fuente de datos**.

### Filtros tipo Excel (chips arriba)
Chips horizontales con contadores: Todos, Activos, Ganados, Perdidos, Míos, Equipo, Vencen <30d, Vencidos. Click en chip para filtrar. Click otra vez para quitar el filtro. Combinables.

Botón **"Más filtros"** despliega un panel con más opciones (en preparación).

### Buscador inline
Input encima de la tabla: "Buscar empresa, NIF, teléfono...". Filtra en tiempo real. Click en X para limpiar.

### Exportar Excel
Botón **"⤓ Exportar Excel"** arriba a la derecha de la tabla. Descarga un .xlsx con las filas actualmente visibles (filtros aplicados). El nombre incluye la fecha.

### Paginación incremental
La tabla muestra las primeras **200 filas**. Si hay más, aparece al final:
```
Has visto 200 de 543
[Cargar 200 más]  [Cargar todas]
```
Click en el que prefieras.

## Limitaciones / cosas que NO se editan inline
- Etapa operativa (estado) → se cambia con los botones del flujo en el drawer.
- Responsable actual → cambia automáticamente con los handoffs (botón "Pasar a análisis", "Pedir visita", etc.).
- Decisor identificado.

Para estos hay que abrir la ficha y usar los botones específicos.

## Si algo falla
- **"Doble click no edita"** → asegúrate de que es una columna editable (teléfono, origen, valor). El estado y responsable se cambian desde el drawer.
- **"Cambios no se guardan"** → toast rojo con mensaje. Si dice "Sin permisos", no eres responsable ni creador ni admin del caso.
- **"Filtros chips no responden"** → recarga con Ctrl+Shift+R, puede ser caché del navegador.
- **"No descarga el Excel"** → comprueba que el navegador no esté bloqueando descargas (icono junto a la barra de direcciones).
