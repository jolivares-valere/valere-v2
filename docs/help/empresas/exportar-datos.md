---
title: Exportar empresas, contactos y contratos a Excel/CSV
section: empresas
audience: todos
keywords: [exportar, descargar, csv, excel, xlsx, archivo, listado, datos, backup, descarga, externo, tabla]
related:
  - empresas/importar-csv
  - informes/generar-informes
  - contratos/gestionar-contratos
---

# Exportar empresas, contactos y contratos

## Resumen rápido
Cualquier listado del CRM (Empresas, Contactos, Contratos, Oportunidades, CUPS, Actividades) se puede exportar a **CSV** o **Excel**. En la cabecera de cada listado, botón **Exportar** → elige formato → descarga.

## Cómo exportar paso a paso

1. Menú lateral → ve a la página del listado que quieres exportar (Empresas, Contactos, Contratos, etc.).
2. (Opcional) **Aplica los filtros** que correspondan: solo se exportan las filas visibles tras filtrar (ej. solo empresas de tu equipo, solo contratos activos).
3. Pulsa el botón **Exportar** o el icono ⬇ arriba a la derecha del listado.
4. Elige formato:
   - **CSV** — para abrir en cualquier hoja de cálculo o procesar con scripts.
   - **Excel (.xlsx)** — para usar fórmulas, formato y filtros de Excel directamente.
5. El archivo se descarga al navegador (carpeta Descargas).

## Qué se incluye en cada exportación

### Empresas (`empresas-YYYY-MM-DD.xlsx`)
Columnas: Nombre, NIF/CIF, Tipo, Segmento, Email, Teléfono, Web, Dirección, CP, Ciudad, Provincia, Comercial asignado, Fecha alta, Estado, Notas.

### Contactos (`contactos-YYYY-MM-DD.xlsx`)
Columnas: Nombre, Apellidos, Empresa, Cargo, Departamento, Email, Teléfono fijo, Móvil, Decisor (sí/no), Firmante (sí/no), Tags, Fecha alta.

### Contratos (`contratos-YYYY-MM-DD.xlsx`)
Columnas: Número, Empresa, Comercializadora, Estado, Tipo energía, Tarifa, Fecha firma, Fecha inicio, Fecha fin, Días para vencer, Potencia contratada, Comercial.

### Oportunidades (`oportunidades-YYYY-MM-DD.xlsx`)
Columnas: Título, Empresa, Etapa, Probabilidad, Valor estimado (€), Ahorro anual (€), Fecha cierre prevista, Comercial, Días en etapa.

### CUPS (`cups-YYYY-MM-DD.xlsx`)
Columnas: Código CUPS, Empresa, Tarifa, Potencia P1-P6, Comercializadora actual, Estado.

### Actividades (`actividades-YYYY-MM-DD.xlsx`)
Columnas: Tipo, Título, Entidad asociada, Fecha actividad, Fecha vencimiento, Estado, Asignado a, Resultado.

## Filtros y exportación

**Importante**: la exportación respeta los filtros aplicados al listado. Ejemplos:

- Filtras Contratos por estado=activo y comercializadora=Iberdrola → exporta solo esos.
- Filtras Oportunidades por etapa=Negociación → exporta solo esas.
- Búsqueda activa en la barra → exporta solo los resultados de la búsqueda.

Si quieres exportar **todo sin filtros**, asegúrate de quitar todos los filtros antes de pulsar Exportar.

## Tamaño máximo

- Hasta **10.000 filas** por exportación, sin esperar.
- Más de 10.000 → el sistema genera el archivo en background y avisa por email/notificación cuando esté listo (1-3 minutos).

## Permisos

La exportación devuelve **solo las filas que tu rol puede ver**:
- Comercial → sus empresas/contratos/oportunidades.
- Manager → su equipo.
- Master/admin → todo.

No hay forma de exportar por encima de tu rol — para listados completos pide al admin.

## Casos de uso típicos

- **Backup mensual**: exportar el listado completo de empresas y contratos al final de cada mes para tener una foto offline.
- **Reporting externo**: enviar a un cliente, partner o auditor el listado de sus contratos o consumos.
- **Análisis en Excel**: cruzar datos del CRM con datos de otra fuente (Datadis, comercializadora) para análisis ad-hoc.
- **Limpieza de datos**: exportar, revisar duplicados o errores en Excel, y volver a importar (ver `empresas/importar-csv.md`).
- **Migración / cambio de CRM**: exportación en CSV facilita migrar a otro sistema si fuese necesario (poco probable, pero opción abierta).

## Datos personales y RGPD

Los archivos exportados contienen datos personales (emails, teléfonos, direcciones). Buenas prácticas:

- **Guarda los archivos en sitio seguro** (no en el escritorio compartido, no en Drive público).
- **Bórralos cuando ya no los necesites**.
- **No envíes a terceros sin autorización del cliente** (especialmente contactos).
- Si la exportación es para enviar a un cliente, **filtra solo sus datos** antes de exportar.

## Errores frecuentes

- **"Demasiadas filas, generando archivo..."**: >10.000 filas. Espera el email/notificación.
- **"No tienes permiso para exportar"**: rol cliente o restringido. Pide al admin.
- **El archivo se abre raro en Excel (caracteres extraños)**: el CSV viene en UTF-8 con BOM. Excel debería detectarlo. Si no, abre desde Excel con "Datos → Desde texto/CSV → Origen UTF-8".
- **El archivo descargado está vacío**: revisa que el listado actual no esté filtrado con criterios sin resultados. Quita filtros y reintenta.

## Preguntas relacionadas

- ¿Cómo importar de vuelta un CSV editado?
- ¿Puedo programar exportaciones automáticas mensuales?
- ¿Se puede exportar las facturas del último año en bloque?
- ¿Cómo descargar todos los documentos PDF de una empresa de golpe?
